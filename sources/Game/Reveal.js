import * as THREE from 'three/webgpu'
import { color, uniform, vec2 } from 'three/tsl'
import { Game } from './Game.js'
import gsap from 'gsap'

export class Reveal
{
    constructor()
    {
        this.game = Game.getInstance()
        
        this.step = -1
        // Point de départ : Accueil (landing) dès le chargement
        let respawn = this.game.respawns.getByName('landing') ?? this.game.respawns.getDefault()
        if (!respawn || !respawn.position) {
            respawn = { position: new THREE.Vector3(0, 0, 0) }
        }
        this.position = respawn.position.clone()
        this.position2Uniform = uniform(vec2(this.position.x, this.position.z))
        this.distance = uniform(0)
        this.thickness = uniform(0.05)
        this.color = uniform(color('#e88eff'))
        this.intensity = uniform(5.5)
        this.intensityMultiplier = 1
        this.sound = this.game.audio.register({
            path: 'sounds/reveal/reveal-1.mp3',
            autoplay: false,
            loop: false,
            volume: 0.5,
            preload: true
        })

        if(this.game.debug.active)
        {
            this.debugPanel = this.game.debug.panel.addFolder({
                title: '📜 Reveal',
                expanded: false,
            })

            this.debugPanel.addBinding(this.distance, 'value', { label: 'distance', min: 0, max: 20, step: 0.01 })
            this.debugPanel.addBinding(this.thickness, 'value', { label: 'thickness', min: 0, max: 1, step: 0.001 })
            // this.game.debug.addThreeColorBinding(this.debugPanel, this.color.value, 'color')
            this.debugPanel.addBinding(this.intensity, 'value', { label: 'intensity', min: 1, max: 20, step: 0.001 })
        }

        this.update = this.update.bind(this)
        this.game.ticker.events.on('tick', this.update, 10)
    }

    updateStep(step)
    {
        const speedMultiplier = location.hash.match(/skip/i) ? 4 : 1

        // Step 0
        if(step === 0)
        {
                // Placer joueur/caméra à l'Accueil dès le début (avant "Click to Start") pour éviter téléportation/latence
                let r0 = this.game.respawns.getByName('landing')
                if (!r0 || !r0.position) r0 = this.game.respawns.getDefault()
                if (r0 && r0.position)
                {
                    this.game.physicalVehicle.moveTo(r0.position, r0.rotation)
                    if (this.game.physicalVehicle.chassis?.physical?.body && !this.game.physicalVehicle.chassis.physical.body.isEnabled())
                        this.game.physicalVehicle.activate()
                    this.game.player.state = this.game.player.constructor.STATE_DEFAULT
                    this.game.player.position.copy(r0.position)
                    this.game.player.position2.set(r0.position.x, r0.position.z)
                    this.game.view.focusPoint.trackedPosition.set(r0.position.x, 0, r0.position.z)
                    this.game.view.focusPoint.position.copy(this.game.view.focusPoint.trackedPosition)
                    this.game.view.focusPoint.smoothedPosition.copy(this.game.view.focusPoint.trackedPosition)
                }
                this.game.view.zoom.baseRatio = 0
                this.game.view.zoom.smoothedRatio = 0

                // Intro loader => Hide circle
            this.game.world.intro.circle.hide(() =>
            {
                // Grid
                this.game.world.grid.show()

                // Reveal
                this.distance.value = 0

                gsap.to(
                    this.distance,
                    {
                        value: 3.5,
                        ease: 'back.out(1.7)',
                        duration: 2 / speedMultiplier,
                        overwrite: true,
                    }
                )

                // View : déjà au niveau de l'Accueil (zoom 0) pour éviter téléportation/latence au clic
                this.game.view.zoom.smoothedRatio = 0
                this.game.view.zoom.baseRatio = 0

                // Intro loader => Show label and sound button
                this.game.world.intro.setText()
                this.game.world.intro.setSoundButton()
                this.game.ticker.wait(1, () =>
                {
                    this.game.world.intro.showLabel()
                })

                // Cherry trees
                if(this.game.world.cherryTrees)
                    this.game.world.cherryTrees.leaves.seeThroughMultiplier = 0.5

                // Click
                if(location.hash.match(/skip/i))
                {
                    this.updateStep(1)
                }
                else
                {
                    // Next function
                    const next = () =>
                    {
                        this.updateStep(1)
                        this.game.inputs.events.off('introStart', inputCallback)
                        this.game.rayCursor.removeIntersect(intersect)
                    }

                    // Input callback
                    const inputCallback = () =>
                    {
                        next()
                    }

                    // Intsect
                    const position = this.position.clone()
                    position.y = 0
                    
                    const intersect = this.game.rayCursor.addIntersect({
                        active: true,
                        shape: new THREE.Sphere(position, 3.5),
                        onClick: next,
                        onEnter: () =>
                        {
                            gsap.to(this, { intensityMultiplier: 1.22, duration: 0.2, overwrite: true })
                        },
                        onLeave: () =>
                        {
                            gsap.to(this, { intensityMultiplier: 1, duration: 0.2, overwrite: true })
                        }
                    })
                    
                    // Inputs (for gamepad and keyboard)
                    this.game.inputs.addActions([
                        { name: 'introStart', categories: [ 'intro' ], keys: [ 'Gamepad.cross', 'Keyboard.Enter', 'Keyboard.ArrowUp', 'Keyboard.ArrowDown', 'Keyboard.KeyW', 'Keyboard.KeyD' ] },
                    ])

            // { name: 'forward',               categories: [ 'wandering', 'racing', 'cinematic' ], keys: [ 'Keyboard.ArrowUp', 'Keyboard.KeyW', 'Gamepad.up', 'Gamepad.r2' ] },
            // { name: 'right',                 categories: [ 'wandering', 'racing', 'cinematic' ], keys: [ 'Keyboard.ArrowRight', 'Keyboard.KeyD', 'Gamepad.right' ] },
                    this.game.inputs.events.on('introStart', inputCallback)
                }
            })
        }
        else if(step === 1)
        {
            // Audio
            this.game.audio.init()
            this.sound.play()

            // Reveal
            gsap.to(
                this.distance,
                {
                    value: 30,
                    ease: 'back.in(1.3)',
                    duration: 2 / speedMultiplier,
                    overwrite: true,
                    onComplete: () =>
                    {
                        this.distance.value = 99999
                    }
                }
            )

            // Intro loader => Hide label
            this.game.world.intro.hideLabel()

            // Inputs
            this.game.inputs.filters.clear()
            this.game.inputs.filters.add('wandering')

            // Sync finale (déjà à l'Accueil depuis step 0, simple rappel au cas où)
            let r = this.game.respawns.getByName('landing')
            if (!r || !r.position) r = this.game.respawns.getDefault()
            if (r && r.position)
            {
                this.game.physicalVehicle.moveTo(r.position, r.rotation)
                if (this.game.physicalVehicle.chassis?.physical?.body && !this.game.physicalVehicle.chassis.physical.body.isEnabled())
                    this.game.physicalVehicle.activate()
                this.game.player.state = this.game.player.constructor.STATE_DEFAULT
                this.game.player.position.copy(r.position)
                this.game.player.position2.set(r.position.x, r.position.z)
                this.game.view.focusPoint.trackedPosition.set(r.position.x, 0, r.position.z)
                this.game.view.focusPoint.position.copy(this.game.view.focusPoint.trackedPosition)
                this.game.view.focusPoint.smoothedPosition.copy(this.game.view.focusPoint.trackedPosition)
            }
            this.game.view.focusPoint.isTracking = true
            this.game.view.focusPoint.magnet.active = false

            // Zoom déjà à 0 depuis step 0 : pas d'animation zoom, on attend la fin du reveal puis step 2
            gsap.delayedCall(2 / speedMultiplier, () => this.updateStep(2))

            // Cherry trees
            if(this.game.world.cherryTrees)
            {
                gsap.to(
                    this.game.world.cherryTrees.leaves,
                    {
                        seeThroughMultiplier: 1,
                        ease: 'power1.inOut',
                        duration: 2 / speedMultiplier,
                        overwrite: true
                    }
                )
            }
        }
        else if(step === 2)
        {
            this.game.interactivePoints.recover()
            
            this.game.world.step(2)
            this.game.world.grid.destroy()
            this.game.world.intro.destroy()
            this.game.world.intro = null

            this.game.server.start()

            this.game.ticker.events.off('tick', this.update)
        }

        this.step = step
    }

    update()
    {
        this.color.value.copy(this.game.dayCycles.properties.revealColor.value)
        this.intensity.value = this.game.dayCycles.properties.revealIntensity.value * this.intensityMultiplier
    }
}