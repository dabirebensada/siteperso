import * as THREE from 'three/webgpu'

import { Debug } from './Debug.js'
import { Inputs } from './Inputs/Inputs.js'
import { Physics } from './Physics/Physics.js'
import { Rendering } from './Rendering.js'
import { ResourcesLoader } from './ResourcesLoader.js'
import { Ticker } from './Ticker.js'
import { Time } from './Time.js'
import { Player } from './Player.js'
import { View } from './View.js'
import { Viewport } from './Viewport.js'
import { World } from './World/World.js'
import { Tracks } from './Tracks.js'
// import { Monitoring } from './Monitoring.js'
import { Lighting } from './Ligthing.js'
import { Materials } from './Materials.js'
import { Objects } from './Objects.js'
import { Fog } from './Fog.js'
import { DayCycles } from './Cycles/DayCycles.js'
import { Weather } from './Weather.js'
import { Noises } from './Noises.js'
import { Wind } from './Wind.js'
import { Terrain } from './Terrain.js'
import { Explosions } from './Explosions.js'
import { YearCycles } from './Cycles/YearCycles.js'
import { Server } from './Server.js'
import { Modals } from './Modals.js'
import { PhysicsVehicle } from './Physics/PhysicsVehicle.js'
import { PhysicsWireframe } from './Physics/PhysicsWireframe.js'
import { Zones } from './Zones.js'
import { Overlay } from './Overlay.js'
import { Tornado } from './Tornado.js'
import { InteractivePoints } from './InteractivePoints.js'
import { Respawns } from './Respawns.js'
import { Audio } from './Audio.js'
import { ClosingManager } from './ClosingManager.js'
import { RayCursor } from './RayCursor.js'
import { Water } from './Water.js'
import { Reveal } from './Reveal.js'
import { KonamiCode } from './KonamiCode.js'
import { Achievements } from './Achievements.js'
import { Notifications } from './Notifications.js'
import { Quality } from './Quality.js'
import { Menu } from './Menu.js'
import { Title } from './Title.js'
import { PreRenderer } from './PreRenderer.js'
import { Options } from './Options.js'
import gsap from 'gsap'
import { Map } from './Map.js'

export class Game
{
    static getInstance()
    {
        return Game.instance
    }

    constructor()
    {
        // Singleton
        if(Game.instance)
            return Game.instance

        Game.instance = this

        this.init()
    }

    async init()
    {
        // Setup
        this.domElement = document.querySelector('.game')
        this.canvasElement = this.domElement.querySelector('.js-canvas')

        // First batch for intro
        this.scene = new THREE.Scene()
        this.debug = new Debug()
        this.resourcesLoader = new ResourcesLoader()
        this.quality = new Quality()
        this.server = new Server()
        this.ticker = new Ticker()
        this.time = new Time()
        this.dayCycles = new DayCycles()
        this.yearCycles = new YearCycles()
        this.inputs = new Inputs([], [ 'intro' ])
        this.audio = new Audio()
        this.notifications = new Notifications()
        this.rayCursor = new RayCursor()
        this.viewport = new Viewport(this.domElement)
        this.modals = new Modals()
        this.menu = new Menu()
        this.rendering = new Rendering()
        await this.rendering.setRenderer()
        this.resources = await this.resourcesLoader.load([
            [ 'respawnsReferencesModel',    'respawns/respawnsReferences-compressed.glb', 'gltf' ],
            [ 'behindTheSceneStarsTexture', 'behindTheScene/stars.ktx',                   'textureKtx', (resource) => { resource.colorSpace = THREE.SRGBColorSpace; resource.minFilter = THREE.NearestFilter; resource.magFilter = THREE.NearestFilter; resource.generateMipmaps = false; resource.wrapS = THREE.RepeatWrapping; resource.wrapT = THREE.RepeatWrapping; } ],
            [ 'soundTexture',               'intro/sound.ktx',                            'textureKtx', (resource) => { resource.minFilter = THREE.LinearFilter; resource.magFilter = THREE.LinearFilter; resource.generateMipmaps = false; resource.repeat.x = 0.5; } ],
            [ 'paletteTexture',             'palette.ktx',                                'textureKtx', (resource) => { resource.minFilter = THREE.NearestFilter; resource.magFilter = THREE.NearestFilter; resource.generateMipmaps = false; resource.colorSpace = THREE.SRGBColorSpace; } ],

        ])
        this.options = new Options()
        this.respawns = new Respawns(import.meta.env.VITE_PLAYER_SPAWN || 'landing')
        this.view = new View()
        this.rendering.setPostprocessing()
        this.rendering.start()
        this.reveal = new Reveal()
        this.noises = new Noises()
        this.weather = new Weather()
        this.wind = new Wind()
        this.tracks = new Tracks()
        this.lighting = new Lighting()
        this.fog = new Fog()
        this.water = new Water()
        this.materials = new Materials()
        this.objects = new Objects()
        this.explosions = new Explosions()
        this.world = new World()

        // Load and init RAPIER
        const rapierPromise = import('@dimforge/rapier3d')

        // Load rest of resources
        const resourcesPromise = this.resourcesLoader.load(
            [
                [ 'foliageTexture',                        'foliage/foliageSDF.ktx',                                     'textureKtx', (resource) => { resource.minFilter = THREE.NearestFilter; resource.magFilter = THREE.NearestFilter; resource.generateMipmaps = false; } ],
                [ 'bushesReferences',                      'bushes/bushesReferences-compressed.glb',                     'gltf' ],
                [ 'vehicle',                               'vehicle/default-compressed.glb',                             'gltf' ],
                [ 'playgroundVisual',                      'playground/playgroundVisual-compressed.glb',                 'gltf' ],
                [ 'playgroundPhysical',                    'playground/playgroundPhysical-compressed.glb',               'gltf' ],
                [ 'flowersReferencesModel',                'flowers/flowersReferences-compressed.glb',                   'gltf' ],
                [ 'bricksModel',                           'bricks/bricks-compressed.glb',                               'gltf' ],
                [ 'fencesModel',                           'fences/fences-compressed.glb',                               'gltf' ],
                [ 'benchesModel',                          'benches/benches-compressed.glb',                             'gltf' ],
                [ 'explosiveCratesModel',                  'explosiveCrates/explosiveCrates-compressed.glb',             'gltf' ],
                [ 'lanternsModel',                         'lanterns/lanterns-compressed.glb',                           'gltf' ],
                [ 'terrainTexture',                        'terrain/terrain.ktx',                                        'textureKtx', (resource) => { resource.flipY = false; } ],
                [ 'terrainModel',                          'terrain/terrain-compressed.glb',                             'gltf' ],
                [ 'floorSlabsTexture',                     'floor/slabs.ktx',                                            'textureKtx', (resource) => { resource.wrapS = THREE.RepeatWrapping; resource.wrapT = THREE.RepeatWrapping; resource.minFilter = THREE.LinearFilter; resource.magFilter = THREE.LinearFilter; resource.generateMipmaps = false } ],
                [ 'birchTreesVisualModel',                 'birchTrees/birchTreesVisual-compressed.glb',                 'gltf' ],
                [ 'birchTreesReferencesModel',             'birchTrees/birchTreesReferences-compressed.glb',             'gltf' ],
                [ 'oakTreesVisualModel',                   'oakTrees/oakTreesVisual-compressed.glb',                     'gltf' ],
                [ 'oakTreesReferencesModel',               'oakTrees/oakTreesReferences.glb',                            'gltf'    ],
                [ 'cherryTreesVisualModel',                'cherryTrees/cherryTreesVisual-compressed.glb',               'gltf' ],
                [ 'cherryTreesReferencesModel',            'cherryTrees/cherryTreesReferences-compressed.glb',           'gltf' ],
                [ 'sceneryModel',                          'scenery/scenery-compressed.glb',                             'gltf' ],
                [ 'areasModel',                            'areas/areas-compressed.glb',                                 'gltf' ],
                [ 'poleLightsModel',                       'poleLights/poleLights-compressed.glb',                       'gltf' ],
                [ 'satanStarTexture',                      'areas/satanStar.ktx',                                        'textureKtx', (resource) => { resource.minFilter = THREE.LinearFilter; resource.magFilter = THREE.LinearFilter; resource.generateMipmaps = false } ],
                [ 'tornadoPathReferencesModel',            'tornado/tornadoPathReferences-compressed.glb',               'gltf' ],
                [ 'overlayPatternTexture',                 'overlay/overlayPattern.ktx',                                 'textureKtx', (resource) => { resource.wrapS = THREE.RepeatWrapping; resource.wrapT = THREE.RepeatWrapping; resource.magFilter = THREE.NearestFilter; resource.minFilter = THREE.NearestFilter; resource.generateMipmaps = false } ],
                [ 'interactivePointsKeyIconCrossTexture',  'interactivePoints/interactivePointsKeyIconCross.ktx',        'textureKtx', (resource) => { resource.minFilter = THREE.NearestFilter; resource.magFilter = THREE.NearestFilter; resource.generateMipmaps = false } ],
                [ 'interactivePointsKeyIconEnterTexture',  'interactivePoints/interactivePointsKeyIconEnter.ktx',        'textureKtx', (resource) => { resource.minFilter = THREE.NearestFilter; resource.magFilter = THREE.NearestFilter; resource.generateMipmaps = false } ],
                [ 'interactivePointsKeyIconATexture',      'interactivePoints/interactivePointsKeyIconA.ktx',            'textureKtx', (resource) => { resource.minFilter = THREE.NearestFilter; resource.magFilter = THREE.NearestFilter; resource.generateMipmaps = false } ],
                [ 'achievementsGlyphsTexture',             'achievements/glyphs.ktx',                                    'textureKtx', (resource) => { resource.minFilter = THREE.LinearFilter; resource.magFilter = THREE.LinearFilter; resource.generateMipmaps = false; resource.wrapS = THREE.RepeatWrapping; } ],
                [ 'careerFreelancerTexture',               'career/careerFreelancer.ktx',                                'textureKtx', (resource) => { resource.flipY = false; resource.minFilter = THREE.LinearFilter; resource.magFilter = THREE.LinearFilter; resource.generateMipmaps = false; resource.wrapS = THREE.ClampToEdgeWrapping; resource.wrapT = THREE.ClampToEdgeWrapping; } ],
                [ 'careerHeticTexture',                    'career/careerHetic.ktx',                                     'textureKtx', (resource) => { resource.flipY = false; resource.minFilter = THREE.LinearFilter; resource.magFilter = THREE.LinearFilter; resource.generateMipmaps = false; resource.wrapS = THREE.ClampToEdgeWrapping; resource.wrapT = THREE.ClampToEdgeWrapping; } ],
                [ 'careerImmersiveGardenTexture',          'career/careerImmersiveGarden.ktx',                           'textureKtx', (resource) => { resource.flipY = false; resource.minFilter = THREE.LinearFilter; resource.magFilter = THREE.LinearFilter; resource.generateMipmaps = false; resource.wrapS = THREE.ClampToEdgeWrapping; resource.wrapT = THREE.ClampToEdgeWrapping; } ],
                [ 'careerIRLTeacherTexture',               'career/careerIRLTeacher.ktx',                                'textureKtx', (resource) => { resource.flipY = false; resource.minFilter = THREE.LinearFilter; resource.magFilter = THREE.LinearFilter; resource.generateMipmaps = false; resource.wrapS = THREE.ClampToEdgeWrapping; resource.wrapT = THREE.ClampToEdgeWrapping; } ],
                [ 'careerOnlineTeacherTexture',            'career/careerOnlineTeacher.ktx',                             'textureKtx', (resource) => { resource.flipY = false; resource.minFilter = THREE.LinearFilter; resource.magFilter = THREE.LinearFilter; resource.generateMipmaps = false; resource.wrapS = THREE.ClampToEdgeWrapping; resource.wrapT = THREE.ClampToEdgeWrapping; } ],
                [ 'careerUzikTexture',                     'career/careerUzik.ktx',                                      'textureKtx', (resource) => { resource.flipY = false; resource.minFilter = THREE.LinearFilter; resource.magFilter = THREE.LinearFilter; resource.generateMipmaps = false; resource.wrapS = THREE.ClampToEdgeWrapping; resource.wrapT = THREE.ClampToEdgeWrapping; } ],
            ],
            (toLoad, total) =>
            {
                this.world.intro.updateProgress(1 - toLoad / total)
            }
        )

        const [ newResources, RAPIER ] = await Promise.all([ resourcesPromise, rapierPromise ])
        this.RAPIER = RAPIER
        this.resources = { ...newResources, ...this.resources }

        this.terrain = new Terrain()
        this.physics = new Physics()
        this.wireframe = new PhysicsWireframe()
        this.physicalVehicle = new PhysicsVehicle()
        this.zones = new Zones()
        this.player = new Player()
        this.closingManager = new ClosingManager()
        this.interactivePoints = new InteractivePoints()
        this.overlay = new Overlay()
        this.konamiCode = new KonamiCode()
        this.achievements = new Achievements()
        this.tornado = new Tornado()
        this.map = new Map()
        this.title = new Title()
        // this.monitoring = new Monitoring()
        this.world.step(1)

        // Positionner tous les éléments au niveau réel de l'Accueil (où est DABIRE BEN)
        this._syncSpawnToAccueil()

        // Pre-render if quality high (asynchrone pour ne pas bloquer)
        // --- DÉBUT DE LA CORRECTION ---
        // On rend le PreRenderer asynchrone pour ne pas bloquer l'initialisation
        if(this.quality.level === 0 && this.rendering.renderer.backend.isWebGPUBackend)
        {
            // On attend quelques frames pour que tout soit prêt avant le pre-render
            this.ticker.wait(1, () =>
            {
                // On fait le pre-render de manière asynchrone
                requestAnimationFrame(() =>
                {
                    try {
                        PreRenderer.render()
                    } catch (error) {
                        console.warn('Game.js : Erreur lors du PreRenderer, continuation sans pré-rendu', error)
                    }
                })
            })
        }
        // --- FIN DE LA CORRECTION ---

        this.ticker.wait(3, () =>
        {
            this.reveal.updateStep(0)
        // --- DÉBUT DE LA CORRECTION ---
            // Fallback : Si après 10 secondes les inputs sont toujours en mode 'intro',
            // on force le passage en mode 'wandering' pour éviter que le joueur soit bloqué
            this.ticker.wait(600, () => // 10 secondes à 60 FPS
            {
                if (this.inputs.filters.has('intro') && !this.inputs.filters.has('wandering')) {
                    console.warn('Game.js : Timeout - Les inputs sont restés en mode "intro", passage forcé en "wandering"')
                    this.inputs.filters.clear()
                    this.inputs.filters.add('wandering')
                    
                    // S'assurer aussi que le véhicule est activé
                    if (this.physicalVehicle.chassis && this.physicalVehicle.chassis.physical && this.physicalVehicle.chassis.physical.body) {
                        if (!this.physicalVehicle.chassis.physical.body.isEnabled()) {
                            this.physicalVehicle.activate()
                        }
                    }
                    
                    // S'assurer que le player est en état DEFAULT
                    if (this.player.state !== Player.STATE_DEFAULT) {
                        this.player.state = Player.STATE_DEFAULT
                    }
                }
            })
        // --- FIN DE LA CORRECTION ---
        })

        // Debug achievement
        if(this.debug.active)
        {
            this.achievements.setProgress('debug', 1)
        }
    }

    _syncSpawnToAccueil()
    {
        const landing = this.world?.areas?.landing
        if (!landing) return

        this.scene.updateMatrixWorld(true)

        const accueilPos = new THREE.Vector3()
        const kioskRef = landing.references?.items?.get('kioskInteractivePoint')
        if (kioskRef?.[0])
        {
            kioskRef[0].getWorldPosition(accueilPos)
            accueilPos.y = 4
        }
        else
        {
            const lettersRef = landing.references?.items?.get('letters')
            if (lettersRef?.[0])
                lettersRef[0].getWorldPosition(accueilPos)
            else
                landing.model.getWorldPosition(accueilPos)
            accueilPos.y = 4
        }

        const landingRespawn = this.respawns.getByName('landing') ?? this.respawns.getDefault()
        const rotation = landingRespawn?.rotation ?? 0

        if (landingRespawn)
            landingRespawn.position.copy(accueilPos)

        this.view.focusPoint.trackedPosition.set(accueilPos.x, 0, accueilPos.z)
        this.view.focusPoint.position.copy(this.view.focusPoint.trackedPosition)
        this.view.focusPoint.smoothedPosition.copy(this.view.focusPoint.trackedPosition)

        this.player.position.copy(accueilPos)
        this.player.position2.set(accueilPos.x, accueilPos.z)

        this.physicalVehicle.moveTo(accueilPos, rotation)
        if (this.physicalVehicle.chassis?.physical?.initialState)
        {
            const ip = this.physicalVehicle.chassis.physical.initialState.position
            ip.x = accueilPos.x
            ip.y = accueilPos.y
            ip.z = accueilPos.z
        }
        if (this.physicalVehicle.chassis?.physical?.body && !this.physicalVehicle.chassis.physical.body.isEnabled())
            this.physicalVehicle.activate()

        this.reveal.position.copy(accueilPos)
        this.reveal.position2Uniform.value.set(accueilPos.x, accueilPos.z)

        this.world.intro.center.copy(accueilPos)
        if (this.world.intro.circle?.mesh)
        {
            this.world.intro.circle.mesh.position.copy(accueilPos)
            this.world.intro.circle.mesh.position.y = 0.001
        }
        if (this.world.intro.label)
        {
            this.world.intro.label.position.copy(accueilPos)
            const q = this.quality.level === 0
            this.world.intro.label.position.x += q ? 3.5 : 2.3
            this.world.intro.label.position.y += 3.3
            this.world.intro.label.position.z += q ? -1 : -1.8
        }

        this.world.grid.mesh.position.x = accueilPos.x
        this.world.grid.mesh.position.z = accueilPos.z
    }

    reset()
    {
        // Interactive buttons
        this.inputs.interactiveButtons.clearItems()

        // Player respawn
        this.player.respawn(null, () =>
        {
            // Objects reset
            this.objects.resetAll()

            // Explosive crates
            if(this.world.explosiveCrates)
                this.world.explosiveCrates.reset()

            // Bowling
            if(this.world.areas.bowling)
                this.world.areas.bowling.restart()

            // Cookie
            if(this.world.areas.cookie)
                this.world.areas.cookie.cookies.instancedGroup.needsUpdate = true

            // Toilet
            if(this.world.areas.toilet)
                this.world.areas.toilet.cabin.down = false

            // Social
            if(this.world.areas.social)
            {
                this.world.areas.social.statue.down = false
                this.world.areas.social.fans.instancedGroup.needsUpdate = true
            }
            
            // Benches
            if(this.world.benches)
                this.world.benches.instancedGroup.needsUpdate = true
            
            // Fences
            if(this.world.fences)
                this.world.fences.instancedGroup.needsUpdate = true
            
            // Bricks
            if(this.world.bricks)
                this.world.bricks.instancedGroup.needsUpdate = true
            
            // Lanterns
            if(this.world.lanterns)
                this.world.lanterns.instancedGroup.needsUpdate = true

            // Achievement
            gsap.delayedCall(2, () =>
            {
                this.achievements.setProgress('reset', 1)
            })
        })
    }
}

