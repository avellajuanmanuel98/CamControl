# CamControl — Arquitectura técnica

Este documento resume el análisis (FASE 1), el diseño (FASE 2) y las decisiones
tomadas al construir el MVP (FASE 3) del gestor centralizado de cámaras.

## 1. Diagnóstico inicial

El repositorio estaba vacío al iniciar este trabajo (sin commits, sin código).
No existía frontend, backend, base de datos ni flujo de autenticación previos.
Todo lo descrito aquí es una construcción nueva, basada en las respuestas
del usuario sobre stack preferido, acceso a EZVIZ y topología de red.

**Stack elegido:** Vue 3 + Node/Express (TypeScript) + PostgreSQL (vía Prisma ORM).

## 2. Contexto de red de las cámaras

Las cámaras son EZVIZ de consumo, conectadas por WiFi a routers de cada sede,
gestionadas hoy a través de la app/plataforma EZVIZ. Esto implica:

- No tienen IP pública ni port-forwarding garantizado (NAT/CGNAT típico de ISP).
- ONVIF y RTSP local normalmente no están expuestos ni garantizados en esta
  línea de producto orientada a consumo.
- El servidor central **no puede** hacer ping/TCP/ONVIF/RTSP directo a las
  cámaras sin desplegar un agente físico dentro de cada red local.

### A vs B: "responde en red" vs "entrega video realmente"

| Nivel | Mecanismo | Qué demuestra | Viable sin agente local |
|---|---|---|---|
| Red | ICMP / TCP | El dispositivo responde en su LAN | ❌ |
| Servicio | ONVIF / RTSP | Expone y sirve video | ❌ (y muchas EZVIZ de consumo no lo soportan) |
| Cloud (heartbeat) | EZVIZ Open API `device/info` | Sesión activa con la nube EZVIZ (igual a lo que ves en la app) | ✅ |
| Cloud (prueba real) | EZVIZ Open API `device/capture` | Pide una foto en vivo; si se entrega, el pipeline de video funciona extremo a extremo | ✅ (mejora futura) |

**Decisión:** usar únicamente la API oficial de EZVIZ Open Platform
(`open.ys7.com`), documentada y con AppKey/AppSecret. Nunca librerías que
hacen ingeniería inversa de la app de consumo (p. ej. pyEzviz), para no
violar los términos de uso de EZVIZ.

```
Cámara (WiFi) → Router/NAT de la sede → Internet → Nube EZVIZ
                                                        ↑ poll periódico
                                          Backend CamControl (worker)
                                                        ↓
                                             PostgreSQL → SSE → Dashboard
```

### Arquitectura de "Monitor Agent" local (preparada, no activa en el MVP)

Si en el futuro se necesita verificar conectividad *dentro* de una sede
(por ejemplo, para detectar "la LAN está caída pero el último estado EZVIZ
quedó cacheado como online"), el patrón recomendado es:

```
Cámaras → Red local de la sede → Monitor Agent (ping/ONVIF/RTSP) → API central → Dashboard
```

El modelo de datos ya distingue el `source` de cada verificación
(`EZVIZ_API`, `MANUAL`, `SYSTEM`) para poder añadir `LOCAL_AGENT` sin
migraciones destructivas cuando se decida implementarlo.

## 3. Determinación de estado y "flapping"

Para no cambiar el estado de una cámara ante un solo fallo transitorio
(que podría ser un timeout de red y no una caída real), el monitor usa un
contador de fallos consecutivos (`consecutiveFails`):

- Falla 1 vez → `WARNING` (intermitente)
- Falla N veces seguidas (`MONITOR_WARNING_FAIL_THRESHOLD`, por defecto 2) → `OFFLINE`
- Responde online → se resetea el contador y pasa a `ONLINE`
- Sin `ezvizDeviceSerial` o sin credenciales activas → `UNCONFIGURED`

## 4. Tiempo real: por qué Server-Sent Events

Con cientos de cámaras (no decenas de miles) y actualizaciones
unidireccionales (servidor → dashboard), SSE es la opción más simple que
cumple el requisito de "sin recargar la página":

- No requiere un protocolo bidireccional (no hay comandos del cliente).
- Reconexión automática nativa del navegador (`EventSource`).
- Un solo `EventEmitter` en el proceso del backend basta; si el sistema
  algún día se escala horizontalmente, se reemplaza por Redis pub/sub sin
  tocar el resto del código.

Un *background worker* (`setInterval`, configurable vía
`MONITOR_INTERVAL_SECONDS`) recorre las cámaras con `ezvizDeviceSerial`,
guarda cada resultado en `camera_status_events` (historial) y emite el
cambio por el bus de eventos, que el endpoint `/dashboard/stream` reenvía
a todos los clientes conectados.

## 5. Seguridad

- JWT + roles (`ADMIN`, `OPERATOR`, `VIEWER`) en cada endpoint mutante.
- Las credenciales EZVIZ (`AppKey`/`AppSecret`) se cifran en reposo con
  AES-256-GCM (`CREDENTIALS_ENCRYPTION_KEY`) y **nunca** se devuelven por la
  API una vez guardadas (endpoint de solo escritura).
- Las imágenes QR se sirven por un endpoint autenticado (no hay URLs
  públicas); el frontend las obtiene como `blob` autenticado y genera un
  object URL local.
- No se manejan URLs RTSP ni contraseñas de cámaras en este MVP (las
  cámaras EZVIZ no las requieren desde esta arquitectura); si en el futuro
  se agregan, deben cifrarse igual que las credenciales EZVIZ.

## 6. Import de Excel/CSV

Mapea encabezados comunes de la hoja de cálculo actual (`S/N`, `CODIGO`,
`CIFRADO`, `CAPACIDAD`, `User_Compartidos`, `ESTADO`, y opcionalmente
`SEDE`) sin importar mayúsculas/acentos. Corre en modo `dryRun` (previsualización,
no escribe nada) y luego en modo commit (crea/actualiza/omite y guarda un
`ImportBatch` de auditoría). La columna `QR` se ignora intencionalmente: la
librería usada (SheetJS) no extrae imágenes incrustadas en el Excel de forma
confiable, así que el QR se sube manualmente después de importar, como
confirmó el usuario que era aceptable.

## 7. Alertas (preparado, no activo)

Existen los modelos `AlertRule` y `AlertEvent`, con un campo `channel`
(`NONE`, `EMAIL`, `WHATSAPP`, `TELEGRAM`) listo para cuando se implemente el
envío real. Por ahora las alertas quedarían visibles solo dentro de la app
(`channel = NONE`), sin trabajo adicional de integración externa.

## 8. Próximos pasos sugeridos

1. Registrar una cuenta developer en EZVIZ Open Platform y cargar
   AppKey/AppSecret desde `POST /api/monitoring/credentials` (admin).
2. Completar `ezvizDeviceSerial` en las cámaras existentes (se autocompleta
   al subir el QR si el texto decodificado contiene un serial reconocible).
3. Decidir si vale la pena el "Monitor Agent" local para alguna sede en
   particular (p. ej. si se necesita verificar la LAN interna, no solo el
   heartbeat de EZVIZ).
4. Implementar el envío real de alertas (`AlertEvent.channel`) cuando se
   priorice.
