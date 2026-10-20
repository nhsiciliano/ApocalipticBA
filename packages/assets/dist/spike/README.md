# Assets del spike de render (Hito 7)

Placeholders para `apps/mobile/src/spike/`. No son assets del juego: se reemplazan por los de Genex (Hito 10).

## `soldier/` y `soldier-quantized/`

- **Fuente:** `examples/models/gltf/Soldier.glb` del repo de three.js (tag r186, MIT). El modelo y las animaciones (`Idle`, `Walk`, `Run`, `TPose`) son de [mixamo.com](https://www.mixamo.com/) (Adobe): uso libre dentro de un proyecto, sin redistribución como asset suelto. Acá se usa solo como placeholder de prueba.
- **Conversión** (glTF-Transform CLI 4.5.1, desde `packages/assets`): el GLB con texturas embebidas no carga en Hermes (ver `docs/tooling/versiones.md`), así que se exporta como `.gltf` + `.bin` + texturas externas.

```sh
GT=node_modules/.bin/gltf-transform
$GT dedup Soldier.glb dedup.glb          # 2,16 MB → 1,53 MB (accesores repetidos)
$GT prune dedup.glb pruned.glb           # saca TEXCOORD_1..6 y materiales sin uso
$GT copy pruned.glb dist/spike/soldier/Soldier.gltf --vertex-layout separate
$GT quantize pruned.glb dist/spike/soldier-quantized/Soldier.gltf \
  --quantize-position 14 --quantize-normal 10 --quantize-texcoord 12 \
  --vertex-layout separate                 # KHR_mesh_quantization
```

`--vertex-layout separate` (un bufferView por atributo) es por prolijidad: el layout intercalado por defecto también carga, pero entra en el camino de `byteStride` de GLTFLoader (`InterleavedBuffer`), que suma otra variable a la hora de depurar en Hermes.

| Variante            | `.gltf` | `.bin` | Texturas (jpg 1024²)            | Extensiones requeridas  |
| ------------------- | ------- | ------ | ------------------------------- | ----------------------- |
| `soldier`           | 290 KB  | 699 KB | baseColor 297 KB, normal 366 KB | ninguna                 |
| `soldier-quantized` | 290 KB  | 520 KB | las mismas                      | `KHR_mesh_quantization` |

Geometría: 11.376 triángulos, 7.434 vértices, un esqueleto `mixamorig` de 65 huesos, dos `SkinnedMesh` (cuerpo y visor).
