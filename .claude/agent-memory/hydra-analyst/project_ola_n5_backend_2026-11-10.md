---
name: project-ola-n5-backend-2026-11-10
description: Revisión ola N5 backend (ventas/RRHH/logística/compras) — 0 P0/P1, 6 P2; patrones: semilla de datos que invierte una feature, "probar" que ahora persiste, redondeo vs CxC
metadata:
  type: project
---

Ola N5 (2026-11-10): 4 servicios compilan y testean en verde, gates de tenancy en 0. Sin P0/P1; 6 P2.

Patrones nuevos que el compilador no ve:
- **Una semilla de datos puede invertir una feature**: las 8 sucursales sembradas con B001/F001 hacían que "serie por sucursal" metiera el POS en la serie del e-commerce. Consultar la BD (`dbdeveloper`, esquemas dbshop*) antes de dar por buena una feature configurada por datos.
- **Un endpoint "probar" pasa a persistir cuando el receptor empieza a aceptar el tipo**: el test de mapeo contable de logística ahora contabiliza asientos reales.
- **Cobrar menos que el total del comprobante deja residuo en 121101**: el asiento de venta va por el total y el cobro de tesorería por lo cobrado.
- Un job @Scheduled que cancela pedidos sin lock ni @Version compite con el webhook o la pasarela.

**Why:** son las familias que han dado P2 en esta ola.
**How to apply:** en revisiones de ventas/contabilidad, comprobar los datos sembrados, el efecto real de los endpoints de prueba y el cuadre de 121101.
