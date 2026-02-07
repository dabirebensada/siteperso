import * as THREE from 'three/webgpu'
import { Game } from './Game.js'

export class Respawns
{
    constructor(defaultName = 'landing')
    {
        this.game = Game.getInstance()
        this.defaultName = defaultName

        this.setItems()
    }

    setItems()
    {
        this.items = new Map()

        const model = this.game.resources?.respawnsReferencesModel
        if (!model?.scene) {
            console.warn('Respawns.js : Modèle respawnsReferencesModel introuvable, utilisation du fallback.')
            this._addFallbackLanding()
            return
        }

        const collect = []
        model.scene.traverse((child) =>
        {
            const m = (child.name || '').match(/respawn(.+)$/i)
            if (m)
            {
                child.rotation.reorder('YXZ')
                let name = m[1].charAt(0).toLowerCase() + m[1].slice(1)
                collect.push({ name, child })
            }
        })

        for (const { name, child } of collect)
        {
            const worldPos = new THREE.Vector3()
            child.getWorldPosition(worldPos)
            this.items.set(name, {
                name,
                position: new THREE.Vector3(worldPos.x, 4, worldPos.z),
                rotation: child.rotation.y
            })
        }

        if (!this.items.has(this.defaultName)) {
            console.warn(`Respawns.js : Point de spawn "${this.defaultName}" introuvable dans le modèle, ajout du fallback.`)
            this._addFallbackLanding()
        }
    }

    _addFallbackLanding()
    {
        const fallback = {
            name: 'landing',
            position: new THREE.Vector3(0, 4, 0),
            rotation: 0
        }
        this.items.set('landing', fallback)
        if (this.defaultName !== 'landing')
            this.items.set(this.defaultName, fallback)
    }

    getByName(name)
    {
        return this.items.get(name)
    }

    getDefault()
    {
        return this.items.get(this.defaultName) ?? this.items.get('landing') ?? { name: 'landing', position: new THREE.Vector3(0, 4, 0), rotation: 0 }
    }

    getClosest(position)
    {
        let closestItem = null
        let closestDistance = Infinity

        this.items.forEach((item) =>
        {
            const distance = Math.hypot(item.position.x - position.x, item.position.z - position.z)

            if(distance < closestDistance)
            {
                closestDistance = distance
                closestItem = item
            }
        })

        return closestItem
    }
}