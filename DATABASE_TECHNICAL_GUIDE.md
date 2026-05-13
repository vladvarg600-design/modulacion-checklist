# Guia tecnica de base de datos

Este documento describe la estructura real de la base de datos del proyecto, las reglas que deben respetarse al cargar informacion demo y las pautas para que un miembro del equipo o una IA pueda trabajar sobre ella sin romper relaciones ni duplicar registros.

## 1. Objetivo de la base

La aplicacion registra checklist de modulacion de energia y fluidos por:

- fecha
- turno
- maquina
- punto de aislamiento
- tipo de check

La base esta organizada para separar:

- catalogos maestros: maquinas, puntos y tipos de check
- datos transaccionales: respuestas reales del checklist

Para crear informacion demo de 3 meses, normalmente solo se debe insertar informacion en `registros_checklist`.

## 2. Tablas principales

### 2.1 `maquinas`

Catalogo de maquinas por linea.

Columnas:

| Columna | Tipo | Nulo | Descripcion |
| --- | --- | --- | --- |
| `id` | `SERIAL` | No | Identificador interno |
| `nombre` | `VARCHAR(150)` | No | Nombre unico de la maquina |
| `linea` | `VARCHAR(10)` | No | Linea productiva, por ejemplo `L1` o `L2` |
| `mapa_url` | `TEXT` | Si | Imagen del mapa asociada a la maquina |
| `orden` | `INTEGER` | No | Orden visual dentro de la linea |

Restricciones:

- primary key: `id`
- unique: `nombre`
- unique compuesto: `linea, orden`

Volumen actual en produccion:

- 22 maquinas

### 2.2 `puntos_aislamiento`

Catalogo de puntos de aislamiento por maquina.

Columnas:

| Columna | Tipo | Nulo | Descripcion |
| --- | --- | --- | --- |
| `id` | `SERIAL` | No | Identificador interno del punto |
| `maquina_id` | `INTEGER` | Si | FK a `maquinas.id` |
| `id_visual` | `VARCHAR(40)` | No | Codigo visible del punto |
| `descripcion` | `TEXT` | No | Descripcion operativa del punto |
| `orden` | `INTEGER` | No | Orden visual dentro de la maquina |
| `foto_url` | `TEXT` | Si | Imagen asociada al punto |
| `blueprint_x` | `INTEGER` | Si | Coordenada X para el mapa |
| `blueprint_y` | `INTEGER` | Si | Coordenada Y para el mapa |
| `color_hex` | `VARCHAR(7)` | No | Color de marcador, default `#64748b` |

Restricciones:

- primary key: `id`
- foreign key: `maquina_id -> maquinas.id`
- unique compuesto: `maquina_id, id_visual`

Volumen actual en produccion:

- 110 puntos

Regla importante:

- `id_visual` no es globalmente unico; puede repetirse entre maquinas distintas.
- La combinacion correcta para identificar un punto de catalogo es `maquina_id + id_visual`.

### 2.3 `tipos_check`

Catalogo de columnas del checklist.

Columnas:

| Columna | Tipo | Nulo | Descripcion |
| --- | --- | --- | --- |
| `id` | `SERIAL` | No | Identificador interno del tipo de check |
| `nombre` | `VARCHAR(100)` | No | Nombre completo del check |
| `orden` | `INTEGER` | No | Orden en la tabla |
| `grupo` | `VARCHAR(40)` | No | Grupo funcional |
| `descripcion_corta` | `VARCHAR(100)` | No | Etiqueta corta visible |

Restricciones:

- primary key: `id`
- unique compuesto: `grupo, orden`

Valores actuales:

| id | nombre | grupo | orden | descripcion_corta |
| --- | --- | --- | --- | --- |
| 1 | Modulacion Parada > 10 min Danos, EFC, CIP | parada | 1 | Modulacion |
| 2 | Fin de Produccion | parada | 2 | Fin de Produccion |
| 3 | Mantenimiento o Aseo | parada | 3 | Mantenimiento o Aseo |
| 4 | Arranque | arranque | 4 | Arranque |
| 9 | BrakeDown o CIP | breakdown | 5 | BrakeDown o CIP |

Regla importante:

- No asumir que los IDs son consecutivos.
- Hoy existen los IDs `1, 2, 3, 4 y 9`.

### 2.4 `registros_checklist`

Tabla transaccional donde se guarda cada respuesta del checklist.

Columnas:

| Columna | Tipo | Nulo | Descripcion |
| --- | --- | --- | --- |
| `id` | `SERIAL` | No | Identificador interno |
| `fecha` | `DATE` | Si | Fecha del registro; default `CURRENT_DATE` |
| `turno` | `VARCHAR(10)` | No | Turno operativo |
| `modo` | `VARCHAR(20)` | No | Tipo de registro; actualmente la app usa `parada` por defecto |
| `maquina_id` | `INTEGER` | Si | FK a `maquinas.id` |
| `punto_id` | `INTEGER` | No | FK a `puntos_aislamiento.id` |
| `check_id` | `INTEGER` | No | FK a `tipos_check.id` |
| `valor` | `BOOLEAN` | Si | Resultado del check |
| `numero_sharp` | `INTEGER` | Si | Numero Sharp de la jornada |
| `op_numero` | `VARCHAR(50)` | Si | OP asociada a la jornada |
| `firma_operador` | `VARCHAR(100)` | Si | Nombre o firma del operador |
| `firma_supervisor` | `VARCHAR(100)` | Si | Nombre o firma del supervisor |
| `created_at` | `TIMESTAMPTZ` | Si | Fecha de creacion |
| `updated_at` | `TIMESTAMPTZ` | Si | Fecha de ultima actualizacion |

Restricciones:

- primary key: `id`
- foreign key: `maquina_id -> maquinas.id`
- foreign key: `punto_id -> puntos_aislamiento.id`
- foreign key: `check_id -> tipos_check.id`
- unique compuesto: `fecha, turno, modo, maquina_id, punto_id, check_id`

Indices:

- indice compuesto: `fecha, turno, modo, maquina_id`

Volumen actual en produccion:

- 55 filas

## 3. Relaciones entre tablas

Relaciones logicas:

- una linea tiene varias maquinas
- una maquina tiene varios puntos de aislamiento
- cada punto puede evaluarse contra varios tipos de check
- cada fila en `registros_checklist` representa una respuesta para una combinacion unica de fecha, turno, modo, maquina, punto y check

Modelo conceptual:

`maquinas (1) -> (N) puntos_aislamiento`

`maquinas (1) -> (N) registros_checklist`

`puntos_aislamiento (1) -> (N) registros_checklist`

`tipos_check (1) -> (N) registros_checklist`

## 4. Regla principal para datos demo

Para demo historica de 3 meses:

- no inventar IDs manuales
- no insertar catalogos nuevos salvo que sea un requerimiento explicito
- usar catalogos reales de `maquinas`, `puntos_aislamiento` y `tipos_check`
- insertar solo en `registros_checklist`

## 5. Reglas claras para carga de informacion

### 5.1 Reglas de integridad

1. `maquina_id` debe existir en `maquinas`.
2. `punto_id` debe existir en `puntos_aislamiento`.
3. `check_id` debe existir en `tipos_check`.
4. El `punto_id` usado debe pertenecer a la misma `maquina_id` del registro.
5. No se puede repetir la misma combinacion de `fecha + turno + modo + maquina_id + punto_id + check_id`.

### 5.2 Reglas de negocio actuales

1. La UI actual trabaja con turnos `1`, `2` y `3`.
2. Aunque la UI ya no muestra selector de tipo de registro, la base aun tiene la columna `modo`.
3. Para mantener compatibilidad con la aplicacion actual, usar `modo = 'parada'` en la carga demo, salvo que se haga una decision funcional distinta.
4. `numero_sharp` es opcional, pero si se usa debe ser un entero mayor o igual a cero.
5. `op_numero`, `firma_operador` y `firma_supervisor` son metadatos de la jornada y normalmente se repiten en todas las filas de una misma corrida.

### 5.3 Regla de volumen por jornada

Una jornada completa para una maquina genera:

`cantidad de puntos de la maquina * cantidad de tipos_check`

Ejemplo:

- si una maquina tiene 8 puntos
- y existen 5 checks
- una jornada completa genera 40 filas en `registros_checklist`

## 6. Estrategia recomendada para generar 3 meses demo

### Opcion recomendada

Generar historico por jornadas completas.

Pasos:

1. seleccionar una fecha dentro de los ultimos 90 dias
2. seleccionar un turno valido: `1`, `2` o `3`
3. fijar `modo = 'parada'`
4. seleccionar una maquina real
5. obtener todos los puntos de esa maquina
6. obtener todos los tipos de check reales
7. cruzar puntos x checks
8. asignar valores booleanos realistas
9. repetir `numero_sharp`, `op_numero`, `firma_operador` y `firma_supervisor` en toda la jornada

### Variacion realista sugerida

- `valor` con mezcla de `true` y `false`
- `numero_sharp` cambiante entre jornadas
- `op_numero` distinto por fecha o por lote
- firmas con nombres coherentes por turno

## 7. Consultas base para cualquier miembro del equipo o IA

### Obtener maquinas

```sql
SELECT id, nombre, linea, orden
FROM maquinas
ORDER BY linea, orden;
```

### Obtener puntos por maquina

```sql
SELECT id, maquina_id, id_visual, descripcion, orden
FROM puntos_aislamiento
WHERE maquina_id = 10
ORDER BY orden;
```

### Obtener checks reales

```sql
SELECT id, nombre, grupo, orden, descripcion_corta
FROM tipos_check
ORDER BY orden;
```

### Validar filas existentes para una jornada

```sql
SELECT fecha, turno, modo, maquina_id, COUNT(*) AS filas
FROM registros_checklist
GROUP BY fecha, turno, modo, maquina_id
ORDER BY fecha DESC, turno, maquina_id;
```

## 8. Recomendacion tecnica para scripts de carga

Si se usa SQL, Python, Node.js o una IA para generar demo:

1. primero leer catalogos reales
2. construir las filas de `registros_checklist` con esos IDs reales
3. evitar hardcodear `check_id`
4. evitar hardcodear `punto_id` sin validar su `maquina_id`
5. insertar por lotes
6. si se requiere reejecucion segura, usar `ON CONFLICT ... DO UPDATE` o limpiar previamente por rango de fechas

## 9. Riesgos comunes

1. Usar `check_id` asumidos como `1..5` y fallar porque uno real es `9`.
2. Mezclar `punto_id` de una maquina con otra `maquina_id`.
3. Duplicar registros por no respetar la llave unica compuesta.
4. Cargar `modo` distinto al que usa la app actual y luego no ver los registros en la UI.
5. Crear jornadas parciales cuando se esperaba una corrida completa por maquina.

## 10. Recomendacion final

Para cualquier carga demo de 3 meses, la estrategia mas segura es:

- mantener catalogos tal como estan
- insertar solo en `registros_checklist`
- usar `modo = 'parada'`
- usar turnos `1`, `2` y `3`
- resolver IDs desde consultas reales antes de insertar

Archivo fuente principal del esquema:

- [database/schema.sql](database/schema.sql)

Catalogo base actual:

- [database/seed.sql](database/seed.sql)

Comportamiento real de lectura y escritura desde la app:

- [backend/src/server.js](backend/src/server.js)