# Images Parcours — conversion PNG → KTX

Les textures de la section **Parcours** doivent être au format **.ktx** (KTX2/Basis) pour le loader `textureKtx`.

## 1. Copier les 3 PNG ici

Placez dans ce dossier les 3 logos avec **exactement** ces noms :

| Fichier cible       | Rôle |
|---------------------|------|
| `licence3.png`      | Université d’Angers / Faculté des Sciences (Licence 3 Informatique) |
| `bachelor-uco.png`  | UCO Angers (Bachelor Business Data Science) |
| `ib-enko.png`       | ENKO Ouaga (Baccalauréat International) |

Sources (dossier Cursor) :

- `.../images_uas-c92e6731-901d-4552-91ac-c18b29d0a3ad.png` → `licence3.png`
- `.../images_uuco-4a02ffc4-23c5-4a47-ab52-3b624438d40c.png` → `bachelor-uco.png`
- `.../images_enko-2f890f9f-8d96-4469-93fb-d8f57f38aef4.png` → `ib-enko.png`

## 2. Convertir en .ktx

### Prérequis : `toktx` (KTX-Software)

- Windows : [Releases KTX-Software](https://github.com/KhronosGroup/KTX-Software/releases) — installer et ajouter `toktx` au `PATH`.
- Ou via `vcpkg`: `vcpkg install ktx`.

### Lancer la conversion

À la racine du projet :

```bash
npm run compress
```

Le script `scripts/compress.js` transforme tous les PNG (hors `ui`, `favicons`, `social`) en `.ktx` dans le même dossier. Il génère :

- `licence3.ktx`
- `bachelor-uco.ktx`
- `ib-enko.ktx`

## 3. Référence dans `parcours.js`

Utilisez ces noms pour `image` et `imageMini` (même fichier pour les deux au début) :

- `image: 'licence3.ktx'`, `imageMini: 'licence3.ktx'`
- `image: 'bachelor-uco.ktx'`, `imageMini: 'bachelor-uco.ktx'`
- `image: 'ib-enko.ktx'`, `imageMini: 'ib-enko.ktx'`

---

Preset utilisé dans `compress.js` pour `parcours/` :  
`uastc`, `srgb`, `RGB` (logos en couleurs).
