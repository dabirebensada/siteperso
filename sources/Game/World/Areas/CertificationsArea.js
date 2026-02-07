import * as THREE from 'three/webgpu'
import { color, Fn, instancedArray, mix, smoothstep, step, texture, uniform, uv, vec2, vec3, vec4 } from 'three/tsl'
import gsap from 'gsap'
import { Area } from './Area.js'
import { InteractivePoints } from '../../InteractivePoints.js'
import certificationsData from '../../../data/certifications.js'

/**
 * Zone Certifications (ex-Altar). Flammes + pentagramme dans le puit.
 * Ouverture de la modal Certifications :
 * - Clic sur le point interactif (bouton en face du puit)
 * - Tomber dans le puit → respawn puis ouverture de la modal
 */
export class CertificationsArea extends Area
{
    constructor(model)
    {
        super(model)

        if(this.game.debug.active)
        {
            this.debugPanel = this.game.debug.panel.addFolder({
                title: '🏆 Certifications',
                expanded: false,
            })
        }

        this.position = this.references.items.get('altar')[0].position.clone()

        this.color = uniform(color('#ff544d'))
        this.emissive = uniform(8)

        this.hideAltarSpecificRefs()
        this.setBeam()
        this.setBeamParticles()
        this.setDeathZone()
        this.setInteractivePoint()
        this.setCertificationsUI()
    }

    hideAltarSpecificRefs()
    {
        const counter = this.references.items.get('counter')
        if(counter && counter[0])
            counter[0].visible = false
    }

    setBeam()
    {
        const radius = 2.5
        this.height = 6
        this.beamAttenuation = uniform(2)

        const cylinderGeometry = new THREE.CylinderGeometry(radius, radius, this.height, 32, 1, true)
        cylinderGeometry.translate(0, this.height * 0.5, 0)

        const cylinderMaterial = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide })
        cylinderMaterial.outputNode = Fn(() =>
        {
            const baseUv = uv()
            const noiseUv = vec2(baseUv.x.mul(6).add(baseUv.y.mul(-2)), baseUv.y.mul(1).sub(this.game.ticker.elapsedScaledUniform.mul(0.2)))
            const noise = texture(this.game.noises.perlin, noiseUv).r.toVar()
            noise.addAssign(baseUv.y.mul(this.beamAttenuation.add(1)))
            const emissiveColor = this.color.mul(this.emissive)
            const gooColor = this.game.fog.strength.mix(vec3(0), this.game.fog.color)
            const gooMask = step(0.65, noise)
            const finalColor = mix(emissiveColor, gooColor, gooMask)
            noise.greaterThan(1).discard()
            return vec4(finalColor, 1)
        })()

        const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial)
        cylinder.position.copy(this.position)
        this.game.scene.add(cylinder)
        this.objects.hideable.push(cylinder)

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
            const gooColor = this.game.fog.strength.mix(vec3(0), this.game.fog.color)
            const emissiveColor = this.color.mul(this.emissive)
            const finalColor = mix(gooColor, emissiveColor, satanStar)
            return vec4(finalColor, 1)
        })()

        const bottom = new THREE.Mesh(bottomGeometry, bottomMaterial)
        bottom.position.copy(this.position)
        bottom.rotation.x = -Math.PI * 0.5
        this.game.scene.add(bottom)
        this.objects.hideable.push(bottom)

        this.animateBeam = () =>
        {
            gsap.to(this.beamAttenuation, {
                value: 0,
                ease: 'power2.out',
                duration: 0.4,
                onComplete: () =>
                {
                    gsap.to(this.beamAttenuation, { value: 2, ease: 'power2.in', duration: 3 })
                },
            })
        }
    }

    setBeamParticles()
    {
        const count = 150
        const progress = uniform(0)
        const positionArray = new Float32Array(count * 3)
        const scaleArray = new Float32Array(count)
        const randomArray = new Float32Array(count)

        for(let i = 0; i < count; i++)
        {
            const i3 = i * 3
            const spherical = new THREE.Spherical(
                (1 - Math.pow(1 - Math.random(), 2)) * 5,
                Math.random() * Math.PI * 0.4,
                Math.random() * Math.PI * 2
            )
            const pos = new THREE.Vector3().setFromSpherical(spherical)
            positionArray[i3 + 0] = pos.x
            positionArray[i3 + 1] = pos.y
            positionArray[i3 + 2] = pos.z
            scaleArray[i] = Math.random()
            randomArray[i] = Math.random()
        }
        const position = instancedArray(positionArray, 'vec3').toAttribute()
        const scale = instancedArray(scaleArray, 'float').toAttribute()
        const random = instancedArray(randomArray, 'float').toAttribute()

        const particlesMaterial = new THREE.SpriteNodeMaterial()
        particlesMaterial.outputNode = Fn(() =>
        {
            const distanceToCenter = uv().sub(0.5).length()
            const gooColor = this.game.fog.strength.mix(vec3(0), this.game.fog.color)
            const emissiveColor = this.color.mul(this.emissive)
            const finalColor = mix(gooColor, emissiveColor, step(distanceToCenter, 0.35))
            distanceToCenter.greaterThan(0.5).discard()
            return vec4(finalColor, 1)
        })()
        particlesMaterial.positionNode = Fn(() =>
        {
            const localProgress = progress.remapClamp(0, 0.5, 1, 0).pow(6).oneMinus()
            const finalPosition = position.toVar().mulAssign(localProgress)
            finalPosition.y.addAssign(progress.mul(random))
            return finalPosition
        })()
        particlesMaterial.scaleNode = Fn(() =>
        {
            return smoothstep(1, 0.3, progress).mul(scale)
        })()

        const particlesGeometry = new THREE.PlaneGeometry(0.2, 0.2)
        const particles = new THREE.Mesh(particlesGeometry, particlesMaterial)
        particles.count = count
        particles.position.copy(this.position)
        particles.position.y -= 0.1
        this.game.scene.add(particles)
        this.objects.hideable.push(particles)

        this.animateBeamParticles = () =>
        {
            gsap.fromTo(progress, { value: 0 }, { value: 1, ease: 'linear', duration: 3 })
        }
    }

    setDeathZone()
    {
        const position = this.position.clone()
        position.y -= 1.25
        const zone = this.game.zones.create('sphere', position, 2.5)

        zone.events.on('enter', () =>
        {
            this.animateBeam()
            this.animateBeamParticles()
            this.game.player.die(() =>
            {
                this.game.modals.open('certifications')
            })
        })
    }

    setInteractivePoint()
    {
        // Bouton au niveau des escaliers (devant le puit) : offset vers l’approche, légèrement en bas
        let respawn = this.game.respawns.getByName('altar')
        if (!respawn || !respawn.position) {
            respawn = { position: this.position.clone().add(new THREE.Vector3(0, 0, -4)) }
        }
        const buttonPosition = respawn.position.clone()

        this.interactivePoint = this.game.interactivePoints.create(
            buttonPosition,
            'Certifications',
            InteractivePoints.ALIGN_RIGHT,
            InteractivePoints.STATE_CONCEALED,
            () =>
            {
                this.game.inputs.interactiveButtons.clearItems()
                this.game.modals.open('certifications')
                this.interactivePoint.hide()
            },
            () =>
            {
                this.game.inputs.interactiveButtons.addItems(['interact'])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            }
        )

        const certModal = this.game.modals.items.get('certifications')
        if(certModal)
        {
            certModal.events.on('closed', () =>
            {
                this.interactivePoint.show()
            })
        }
    }

    setCertificationsUI()
    {
        const modal = this.game.modals.items.get('certifications')
        if(!modal)
            return

        const listEl = modal.element.querySelector('.js-certifications-list')
        if(!listEl)
            return

        const trophyIcon = 'ui/medal.svg'

        listEl.innerHTML = certificationsData.map((c) =>
        {
            const metaParts = [ c.issuer, c.date ].filter(Boolean)
            const meta = metaParts.length ? metaParts.join(' · ') : ''
            const codeHtml = c.verificationCode
                ? `<div class="cert-code">Code de vérification : ${c.verificationCode}</div>`
                : ''
            const linkHtml = c.url
                ? `<a class="cert-link" href="${c.url}" target="_blank" rel="noreferrer">Voir la certification</a>`
                : ''

            return `
                <li>
                    <img class="cert-icon" src="${trophyIcon}" alt="" />
                    <div class="cert-text">
                        <div class="cert-name">${c.name}</div>
                        ${meta ? `<div class="cert-meta">${meta}</div>` : ''}
                        ${codeHtml}
                        ${linkHtml}
                    </div>
                </li>
            `
        }).join('')
    }
}
