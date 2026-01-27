import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'node:child_process'
import { existsSync } from 'fs'
import { unlink } from 'fs/promises'
import { glob } from 'glob'
import sharp from 'sharp'

/**
 * Models
 */
{
    const gltfTransformBin = path.join(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'gltf-transform.cmd' : 'gltf-transform')
    const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
    const directory = path.join(projectRoot, process.argv[2] || 'static/')
    const files = await glob(
        `${directory}/**/*.glb`,
        {
            ignore:
            {
                ignored: (p) =>
                {
                    return /-(draco|ktx|compressed).glb$/.test(p.name)
                }
            }
        }
    )

    for(const inputFile of files)
    {
        const ktx2File = inputFile.replace('.glb', '-compressed.glb')
        const dracoFile = inputFile.replace('.glb', '-compressed.glb')
        
        const command = spawn(
            gltfTransformBin,
            [
                'etc1s',
                inputFile,
                ktx2File,
                '--quality', '255',
                '--verbose'
            ],
            { shell: true }
        )

        command.stdout.on('data', data => { console.log(`stdout: ${data}`) })
        command.stderr.on('data', data => { console.error(`stderr: ${data}`) })
        command.on('close', code =>
        {
            const dracoCommand = spawn(
                gltfTransformBin,
                [
                    'draco',
                    ktx2File,
                    dracoFile,
                    '--method', 'edgebreaker',
                    '--quantization-volume', 'mesh',
                    '--quantize-position', 12,
                    '--quantize-normal', 6,
                    '--quantize-texcoord', 6,
                    '--quantize-color', 2,
                    '--quantize-generic', 2
                ],
                { shell: true }
            )
            dracoCommand.stdout.on('data', data => { console.log(`stdout: ${data}`) })
            dracoCommand.stderr.on('data', data => { console.error(`stderr: ${data}`) })
        })
    }
}

/**
 * Textures
 */
{
    const toktxBin = process.platform === 'win32' && existsSync('C:\\Program Files\\KTX-Software\\bin\\toktx.exe')
        ? 'C:\\Program Files\\KTX-Software\\bin\\toktx.exe'
        : 'toktx'
    const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
    const directory = path.join(projectRoot, process.argv[2] || 'static/')
    // Sous Windows, glob exige des barres obliques ; le chemin final reste valide pour fs
    const dirSlash = directory.replace(/\\/g, '/')
    const files = [
        ...await glob(`${dirSlash}/**/*.png`, { ignore: '**/{ui,favicons,social}/**' }),
        ...await glob(`${dirSlash}/**/*.jpg`, { ignore: '**/{ui,favicons,social}/**' })
    ]

    const defaultPreset = '--nowarn --2d --t2 --encode etc1s --qlevel 255 --assign_oetf srgb --target_type RGB'
    const presets = [
        [ /test.png$/,                            '--nowarn --2d --t2 --encode etc1s --qlevel 255 --assign_oetf linear --target_type R --swizzle r001' ],

        [ /whispers\/whisperFlame.png$/,          '--nowarn --2d --t2 --encode uastc --qlevel 255 --assign_oetf linear --target_type R --swizzle r001' ],
        [ /achievements\/glyphs.png$/,            '--nowarn --2d --t2 --encode etc1s --qlevel 255 --assign_oetf linear --target_type R --swizzle r001' ],
        [ /areas\/satanStar.png$/,                '--nowarn --2d --t2 --encode etc1s --qlevel 255 --assign_oetf linear --target_type R --swizzle r001' ],
        [ /floor\/slabs.png$/,                    '--nowarn --2d --t2 --encode etc1s --qlevel 255 --assign_oetf linear --target_type R --swizzle r001' ],
        [ /foliage\/foliageSDF.png$/,             '--nowarn --2d --t2 --encode etc1s --qlevel 255 --assign_oetf linear --target_type R --swizzle r001' ],
        [ /interactivePoints\/.+.png$/,           '--nowarn --2d --t2 --encode etc1s --qlevel 255 --assign_oetf linear --target_type R --swizzle r001' ],
        [ /intro\/.+.png$/,                       '--nowarn --2d --t2 --encode etc1s --qlevel 255 --assign_oetf linear --target_type R --swizzle r001' ],
        [ /jukebox\/jukeboxMusicNotes.png$/,      '--nowarn --2d --t2 --encode etc1s --qlevel 255 --assign_oetf linear --target_type R --swizzle r001' ],
        [ /overlay\/overlayPattern.png$/,         '--nowarn --2d --t2 --encode uastc --assign_oetf linear' ],
        [ /palette.png$/,                         '--nowarn --2d --t2 --encode uastc --genmipmap --assign_oetf srgb --target_type RGB' ],
        [ /terrain\/terrain.png$/,                '--nowarn --2d --t2 --encode uastc --genmipmap --assign_oetf linear --target_type RGB' ],
        [ /career\/.+png$/,                       '--nowarn --2d --t2 --encode uastc --assign_oetf srgb --target_type RG' ],
        [ /whispers\/whisperFlame.png$/,          '--nowarn --2d --t2 --encode etc1s --qlevel 255 --assign_oetf linear --target_type R' ],
    ]

    for(const inputFile of files)
    {
        let imageInput = inputFile
        let tempFile = null

        // ETC1S/UASTC/BC7 exigent des dimensions multiples de 4 — on redimensionne les images parcours
        const normalized = inputFile.replace(/\\/g, '/')
        if(/parcours[\\/]images[\\/]/.test(normalized))
        {
            const meta = await sharp(inputFile).metadata()
            const w = meta.width || 4
            const h = meta.height || 4
            const w2 = Math.max(4, Math.floor(w / 4) * 4)
            const h2 = Math.max(4, Math.floor(h / 4) * 4)
            if(w2 !== w || h2 !== h)
            {
                tempFile = inputFile.replace(/\.(png|jpe?g)$/i, '_resized$&')
                await sharp(inputFile).resize(w2, h2).toFile(tempFile)
                imageInput = tempFile
            }
        }

        const ktx2File = inputFile.replace(/\.(png|jpg)$/i, '.ktx')

        let preset = presets.find(preset => preset[0].test(inputFile))

        if(preset)
            preset = preset[1]
        else
            preset = defaultPreset

        await new Promise((resolve, reject) =>
        {
            const command = spawn(
                toktxBin,
                [
                    ...preset.split(' '),
                    ktx2File,
                    imageInput,
                ]
            )
            command.stdout.on('data', data => { console.log(inputFile, '→', String(data).trim()) })
            command.stderr.on('data', data => { console.error(inputFile, 'stderr:', String(data).trim()) })
            command.on('close', code =>
            {
                if(tempFile)
                    unlink(tempFile).catch(() => {})
                if(code !== 0)
                    console.error(inputFile, '→ toktx exit code', code)
                resolve()
            })
            command.on('error', err => { console.error(inputFile, '→ toktx error', err.message); resolve() })
        })
    }
}

/**
 * UI images
 */
{
    const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
    const directory = path.join(projectRoot, process.argv[2] || 'static/')
    const files = await glob(
        `${directory}/ui/**/*.{png,jpg}`
    )

    for(const inputFile of files)
    {
        const webpFile = inputFile.replace(/\.(png|jpg)$/, '.webp')

        await sharp(inputFile)
            .webp({ quality: 80 })
            .toFile(webpFile)
    }
}
