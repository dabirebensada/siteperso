import * as THREE from 'three/webgpu'
import { Game } from '../Game.js'
import { attribute, clamp, color, float, Fn, instancedArray, luminance, max, mix, smoothstep, step, texture, uniform, uv, vec2, vec3, vec4 } from 'three/tsl'
import gsap from 'gsap'

export class Altar
{
    constructor(position, altarCounter)
    {
        this.game = Game.getInstance()

        if(this.game.debug.active)
        {
            this.debugPanel = this.game.debug.panel.addFolder({
                title: '💀 Altar',
                expanded: true,
            })
        }

        this.value = 0
        this.position = position.clone()
        this.altarCounter = altarCounter

        this.colorBottom = uniform(color('#ff544d'))
        this.colorTop = uniform(color('#ff1141'))
        this.emissiveBottom = uniform(8)
        this.emissiveTop = uniform(2.7)

        this.setBeam()
        this.setCounter()
        this.setCounterParticles()

        setInterval(() =>
        {
            this.updateValue(this.value + 1)
        }, 2000)
        this.updateValue(Math.floor(Math.pow(Math.random(), 2) * 999999))

        // Debug
        if(this.game.debug.active)
        {
            this.game.debug.addThreeColorBinding(this.debugPanel, this.colorBottom.value, 'colorBottom')
            this.debugPanel.addBinding(this.emissiveBottom, 'value', { label: 'emissiveBottom', min: 0, max: 10, step: 0.1 })
            this.game.debug.addThreeColorBinding(this.debugPanel, this.colorTop.value, 'colorTop')
            this.debugPanel.addBinding(this.emissiveTop, 'value', { label: 'emissiveTop', min: 0, max: 10, step: 0.1 })
        }
    }

    setBeam()
    {
        const radius = 2.5
        const height = 4

        // Cylinder
        const cylinderGeometry = new THREE.CylinderGeometry(radius, radius, height, 32, 1, true)
        cylinderGeometry.translate(0, height * 0.5, 0)
        
        const cylinderMaterial = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide })

        cylinderMaterial.outputNode = Fn(() =>
        {
            const baseUv = uv().toVar()

            // Emissive
            const emissiveUv = vec2(baseUv.x.mul(6).add(baseUv.y.mul(-2)), baseUv.y.mul(1).sub(this.game.ticker.elapsedScaledUniform.mul(0.2)))
            const emissiveNoise = texture(this.game.noises.others, emissiveUv).r
            emissiveNoise.addAssign(baseUv.y)
            const emissiveMask = step(1, emissiveNoise)
            const emissiveColor = mix(this.colorBottom.mul(this.emissiveBottom), this.colorTop.mul(this.emissiveTop), baseUv.y)

            // Goo
            const gooColor = this.game.fog.strength.mix(vec3(0), this.game.fog.color) // Fog

            // Mix
            // const gooMask = step(emissiveNoise, 0.95)
            const gooMask = step(0.65, emissiveNoise)
            const finalColor = mix(emissiveColor, gooColor, gooMask)

            // Discard
            emissiveMask.greaterThan(0.5).discard()
            
            return vec4(finalColor, 1)
        })()

        const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial)
        cylinder.position.copy(this.position)
        this.game.scene.add(cylinder)

        // Bottom
        const bottomGeometry = new THREE.PlaneGeometry(radius * 2, radius * 2, 1, 1)

        const satanStarTexture = this.game.resources.satanStarTexture
        satanStarTexture.minFilter = THREE.NearestFilter
        satanStarTexture.magFilter = THREE.NearestFilter
        satanStarTexture.generateMipmaps = false
        
        const bottomMaterial = new THREE.MeshBasicNodeMaterial({ transparent: true })
        bottomMaterial.outputNode = Fn(() =>
        {
            const newUv = uv().sub(0.5).mul(1.7).add(0.5)
            const satanStar = texture(satanStarTexture, newUv).r

            const gooColor = this.game.fog.strength.mix(vec3(0), this.game.fog.color) // Fog

            const emissiveColor = this.colorBottom.mul(this.emissiveBottom)
            
            const finalColor = mix(gooColor, emissiveColor, satanStar)

            return vec4(finalColor, 1)
        })()

        const bottom = new THREE.Mesh(bottomGeometry, bottomMaterial)
        bottom.position.copy(this.position)
        bottom.rotation.x = - Math.PI * 0.5
        this.game.scene.add(bottom)
    }

    setCounter()
    {
        const size = 3

        // Canvas
        const ratio = 1 / 4
        const width = 256
        const height = width * ratio
        const font = `700 ${height}px "Amatic SC"`
        
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const textTexture = new THREE.Texture(canvas)
        textTexture.colorSpace = THREE.SRGBColorSpace
        textTexture.minFilter = THREE.NearestFilter
        textTexture.magFilter = THREE.NearestFilter
        textTexture.generateMipmaps = false

        const context = canvas.getContext('2d')
        context.font = font

        // Geometry
        const geometry = new THREE.PlaneGeometry(size, size * ratio, 1, 1)

        // Material
        const material = new THREE.MeshBasicNodeMaterial({ transparent: true })
        material.outputNode = Fn(() =>
        {
            const textData = texture(textTexture, uv())

            const gooColor = this.game.fog.strength.mix(vec3(0), this.game.fog.color) // Fog

            const emissiveColor = this.colorBottom.mul(this.emissiveBottom)
            
            const finalColor = mix(gooColor, emissiveColor, textData.g)

            textData.r.add(textData.g).lessThan(0.5).discard()

            return vec4(finalColor, 1)
        })()

        // Mesh
        const mesh = new THREE.Mesh(geometry, material)
        this.altarCounter.add(mesh)
        
        /**
         * Update
         */
        this.updateCounter = (value) =>
        {
            const formatedValue = value.toLocaleString('en-US')
            context.font = font

            context.fillStyle = '#000000'
            context.fillRect(0, 0, width, height)

            context.font = font
            context.textAlign = 'center'
            context.textBaseline = 'middle'

            context.strokeStyle = '#ff0000'
            context.lineWidth = height * 0.15
            context.strokeText(formatedValue, width * 0.5, height * 0.55)

            context.fillStyle = '#00ff00'
            context.fillText(formatedValue, width * 0.5, height * 0.55)

            textTexture.needsUpdate = true
        }
    }

    setCounterParticles()
    {
        const count = 40

        // Uniforms
        const progress = uniform(0)
        
        // Attributes
        const positionArray = new Float32Array(count * 3)
        const scaleArray = new Float32Array(count)
        const randomArray = new Float32Array(count)
        
        for(let i = 0; i < count; i++)
        {
            const i3 = i * 3

            const angle = Math.random() * Math.PI * 2
            const radius = Math.random() * 1.5
            positionArray[i3 + 0] = Math.cos(angle) * radius
            positionArray[i3 + 1] = Math.sin(angle) * radius
            positionArray[i3 + 2] = 0

            scaleArray[i] = Math.random()
            randomArray[i] = Math.random()
        }
        const position = instancedArray(positionArray, 'vec3').toAttribute()
        const scale = instancedArray(scaleArray, 'float').toAttribute()
        const random = instancedArray(randomArray, 'float').toAttribute()

        // Geometry
        const particlesGeometry = new THREE.PlaneGeometry(0.2, 0.2)

        // Material
        const particlesMaterial = new THREE.SpriteNodeMaterial()
        particlesMaterial.outputNode = Fn(() =>
        {
            const distanceToCenter = uv().sub(0.5).length()

            const gooColor = this.game.fog.strength.mix(vec3(0), this.game.fog.color) // Fog

            const emissiveColor = this.colorBottom.mul(this.emissiveBottom)
            
            const finalColor = mix(gooColor, emissiveColor, step(distanceToCenter, 0.35))

            distanceToCenter.greaterThan(0.5).discard()

            return vec4(finalColor, 1)
        })()
        particlesMaterial.positionNode = Fn(() =>
        {
            const localProgress = progress.remapClamp(0, 0.5, 1, 0).pow(6).oneMinus()
            const finalPosition = position.mul(localProgress)
            finalPosition.y.addAssign(progress.mul(random))
            return finalPosition
        })()
        particlesMaterial.scaleNode = Fn(() =>
        {
            const finalScale = smoothstep(1, 0.3, progress).mul(scale)
            return finalScale
        })()
        
        // Mesh
        const particles = new THREE.Mesh(particlesGeometry, particlesMaterial)
        particles.count = count
        particles.position.z -= 0.1
        this.altarCounter.add(particles)

        this.animateCounterParticles = () =>
        {
            gsap.fromTo(
                progress,
                { value: 0 },
                { value: 1, ease: 'linear', duration: 3 },
            )
        }
    }

    updateValue(value)
    {
        if(value !== this.value)
        {
            this.updateCounter(value)
            this.animateCounterParticles()

            this.value = value
        }
    }
}