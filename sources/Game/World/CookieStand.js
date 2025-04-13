import * as THREE from 'three/webgpu'
import { Game } from '../Game.js'
import { color, float, Fn, mix, normalWorld, positionGeometry, step, storage, texture, uniform, uv, vec2, vec3, vec4 } from 'three/tsl'
import { InstancedGroup } from '../InstancedGroup.js'
import gsap from 'gsap'
import { InteractiveAreas } from '../InteractiveAreas2.js'

export class CookieStand
{
    constructor(cookie, banner, ovenHeat, blower, chimneyPosition, spawnerPosition, interactiveAreaPosition, tablePosition)
    {
        this.game = Game.getInstance()

        if(this.game.debug.active)
        {
            this.debugPanel = this.game.debug.panel.addFolder({
                title: '🍪 Cookie Stand',
                expanded: true,
            })
        }

        this.cookie = cookie
        this.banner = banner
        this.ovenHeat = ovenHeat
        this.blower = blower
        this.chimneyPosition = chimneyPosition
        this.spawnerPosition = spawnerPosition
        this.interactiveAreaPosition = interactiveAreaPosition
        this.tablePosition = tablePosition

        this.setBanner()
        this.setParticles()
        this.setOvenHeat()
        this.setCookies()
        this.setActualCookies()
        this.setInteractiveArea()

        this.game.ticker.events.on('tick', () =>
        {
            this.update()
        })
    }

    setBanner()
    {
        const material = new THREE.MeshBasicNodeMaterial()

        // Shadow receive
        const totalShadows = this.game.lighting.addTotalShadowToMaterial(material)
        const windStrength = float(0).toVarying()

        material.positionNode = Fn(() =>
        {
            const baseUv = uv().toVar()
            const newPosition = positionGeometry.toVar()

            // Wind
            const windUv = baseUv
                .mul(vec2(0.35, 0.175))
                .sub(vec2(0.1, 0.05).mul(this.game.ticker.elapsedScaledUniform))
                .toVar()
            const noise = texture(this.game.noises.others, windUv).r
            windStrength.assign(noise.mul(baseUv.y).mul(this.game.wind.strength))
            const windDirection = vec3(0.5, 0, 1)
            newPosition.addAssign(windDirection.mul(windStrength))

            return newPosition
        })()

        material.outputNode = Fn(() =>
        {
            const baseColor = texture(this.game.resources.cookieBannerTexture)
            baseColor.mulAssign(windStrength.mul(4).add(1))

            return this.game.lighting.lightOutputNodeBuilder(baseColor, normalWorld, totalShadows, true, false)
        })()

        this.banner.material = material
    }

    setParticles()
    {
        const emissiveMaterial = this.game.materials.getFromName('emissiveGradientWarm')

        const count = 30
        const elevation = uniform(3)
        const positions = new Float32Array(count * 3)
        const scales = new Float32Array(count)

        this.localTime = uniform(0)

        for(let i = 0; i < count; i++)
        {
            const i3 = i * 3

            const angle = Math.PI * 2 * Math.random()
            const radius = Math.pow(Math.random(), 1.5) * 0.4
            positions[i3 + 0] = Math.cos(angle) * radius
            positions[i3 + 1] = Math.random()
            positions[i3 + 2] = Math.sin(angle) * radius

            scales[i] = Math.random() * 1 + 0.75
        }
        
        const positionAttribute = storage(new THREE.StorageInstancedBufferAttribute(positions, 3), 'vec3', count).toAttribute()
        const scaleAttribute = storage(new THREE.StorageInstancedBufferAttribute(scales, 1), 'float', count).toAttribute()

        const material = new THREE.SpriteNodeMaterial()
        material.colorNode = emissiveMaterial.colorNode

        const progress = float(0).toVar()

        material.positionNode = Fn(() =>
        {
            const newPosition = positionAttribute.toVar()
            progress.assign(newPosition.y.add(this.localTime.mul(newPosition.y)).fract())

            newPosition.y.assign(progress.mul(elevation))

            const progressHide = step(0.8, progress).mul(100)
            newPosition.y.addAssign(progressHide)
            
            return newPosition
        })()
        material.scaleNode = Fn(() =>
        {
            const progressScale = progress.remapClamp(0.5, 1, 1, 0)
            return scaleAttribute.mul(progressScale)
        })()

        const geometry = new THREE.PlaneGeometry(0.03, 0.03)

        const mesh = new THREE.Mesh(geometry, material)
        mesh.position.copy(this.chimneyPosition)
        mesh.count = count
        mesh.frustumCulled = true
        this.game.scene.add(mesh)
    }

    setOvenHeat()
    {
        const material = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide, transparent: true, depthTest: true, depthWrite: false })

        material.outputNode = Fn(() =>
        {
            const noiseUv = uv().mul(vec2(2, 0.2)).toVar()
            noiseUv.y.addAssign(this.game.ticker.elapsedScaledUniform.mul(0.05))
            const noise = texture(this.game.noises.others, noiseUv).r

            const strength = noise.mul(uv().y.pow(2)).toVar()

            const emissiveMix = strength.smoothstep(0, 0.5)
            const emissiveColor = mix(color('#ff3e00'), color('#ff8641'), emissiveMix).mul(strength.add(1).mul(2))

            return vec4(vec3(emissiveColor), strength)
        })()

        this.ovenHeat.material = material
        this.ovenHeat.castShadow = false
    }

    setCookies()
    {
        this.cookie.removeFromParent()

        this.cookie.traverse((child) =>
        {
            if(child.isMesh)
                child.frustumCulled = false
        })

        this.cookies = {}
        this.cookies.count = 20
        this.cookies.realCount = this.cookies.count + 2
        this.cookies.currentIndex = 0
        this.cookies.mass = 0.02
        this.cookies.entities = []

        const references = []

        for(let i = 0; i < this.cookies.realCount; i++)
        {
            const onTable = i >= this.cookies.count

            // Reference
            const reference = new THREE.Object3D()

            if(onTable)
            {
                reference.position.copy(this.tablePosition)
                reference.position.y += (i - this.cookies.count) * 0.25
            }
            else
            {
                reference.position.copy(this.spawnerPosition)
                reference.position.y -= 4
            }
            references.push(reference)
            
            // Entity
            const entity = this.game.entities.add(
                {
                    model: reference,
                    updateMaterials: false,
                    castShadow: false,
                    receiveShadow: false,
                    parent: null,
                },
                {
                    type: 'dynamic',
                    position: reference.position,
                    rotation: reference.quaternion,
                    friction: 0.7,
                    sleeping: true,
                    enabled: onTable,
                    colliders: [ { shape: 'cylinder', parameters: [ 0.55 / 2, 1.25 / 2 ], mass: this.cookies.mass, category: 'object' } ],
                    waterGravityMultiplier: - 1
                },
            )

            this.cookies.entities.push(entity)
        }

        const instancedGroup = new InstancedGroup(references, this.cookie, true)
    }

    setActualCookies()
    {
        this.actualCookies = {}
        this.actualCookies.count = 0

        const cookies = document.cookie.split('; ')
        for(const cookie of cookies)
        {
            const match = cookie.match('^acceptedCookies=([0-9]+)')

            if(match)
                this.actualCookies.count = parseInt(match[1])
        }
    }

    setInteractiveArea()
    {
        this.game.interactiveAreas.create(
            this.interactiveAreaPosition,
            'Accept cookie',
            InteractiveAreas.ALIGN_RIGHT,
            () =>
            {
                this.accept()
            }
        )

        // this.game.interactiveAreas.create(
        //     this.interactiveAreaPosition.clone().add(new THREE.Vector3(-6, 0, 3)),
        //     'Test',
        //     InteractiveAreas.ALIGN_RIGHT,
        //     () =>
        //     {
        //         // this.accept()
        //     }
        // )
    }

    accept()
    {
        // Cookies
        const entity = this.cookies.entities[this.cookies.currentIndex]

        const spawnPosition = this.spawnerPosition.clone()
        spawnPosition.z += Math.random() - 0.5
        entity.physical.body.setTranslation(spawnPosition)
        entity.physical.body.setEnabled(true)
        window.requestAnimationFrame(() =>
        {
            entity.physical.body.applyImpulse({
                x: (Math.random() - 0.5) * this.cookies.mass * 2,
                y: Math.random() * this.cookies.mass * 3,
                z: this.cookies.mass * 7
            }, true)
            entity.physical.body.applyTorqueImpulse({ x: 0, y: 0, z: 0 }, true)
        })

        this.cookies.currentIndex = (this.cookies.currentIndex + 1) % this.cookies.count

        // Oven heat
        this.ovenHeat.scale.z = 2
        gsap.to(this.ovenHeat.scale, { z: 1, overwrite: true, duration: 2, delay: 0.2, ease: 'power1.inOut' })

        // Actual cookie
        document.cookie = `acceptedCookies=${++this.actualCookies.count}`
    }

    update()
    {
        const timeScale = (Math.sin(this.game.ticker.elapsedScaled) * 0.3 + 0.5) * 0.3
        this.localTime.value += this.game.ticker.deltaScaled * timeScale

        // console.log()
        this.blower.scale.y = Math.sin(this.game.ticker.elapsedScaled + Math.PI) * 0.25 + 0.75
    }
}