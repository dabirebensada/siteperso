import * as THREE from 'three/webgpu'
import { Game } from '../../Game.js'
import { InteractivePoints } from '../../InteractivePoints.js'
import { color, float, Fn, luminance, max, mix, positionGeometry, step, texture, uniform, uv, vec4 } from 'three/tsl'
import gsap from 'gsap'
import { clamp } from 'three/src/math/MathUtils.js'
import { Area } from './Area.js'

// --- DÉBUT PERSONNALISATION ---
// Les 3 expériences professionnelles. year = année affichée quand la voiture passe dessus.
// Pour en ajouter une 4e, 5e ou 6e : ajouter une entrée ici (CAREER_COUNT = length).
// Le GLB a 6 lignes ; au‑delà il faudrait cloner une ligne en code.
const CAREER_EXPERIENCES = [
    { year: 2025, id: 'sunu-assurances', title: 'Stagiaire Data Scientiste', company: 'SUNU Assurances IARD', period: 'Avril 2025 - Juin 2025', location: 'Ouagadougou, Burkina Faso', duration: '3 mois', tasks: ['Création d\'un logiciel de planification et de répartition budgétaire en python', 'Automatisation de fichiers Excel avec macros VBA et Power Query', 'Mise en place d\'un algorithme de traitement des sondages utilisant la méthode de texte mining avec Python', 'Améliorations des fichiers Excel de reporting pour le suivi de décisions', 'Mise en place et gestion d\'espaces cloud pour le partage de fichiers et la collaboration', 'Analyse des coûts'] },
    { year: 2024, id: 'mydataball', title: 'Chargé de la création d\'une solution logicielle R', company: 'MYDATABALL', period: 'Avril 2024 - Juin 2024', location: 'Angers, France', duration: '2 mois', tasks: ['Traitement et Analyse de Bases de données sur Excel', 'Création complète de la structure du logiciel', 'Implémentation de toutes les fonctionnalités (Machine Learning) avec SHINY sur RStudio', 'Gestion des versions, suivi et réalisation des tests logiciels', 'Réalisation du déploiement et de la gestion maintenance', 'Rédaction de toute la documentation du logiciel (Guides)'], links: [{ label: 'Logiciel', url: 'https://softwareanalysisinterface.shinyapps.io/interface_r/' }, { label: 'Scripts GitHub', url: 'https://github.com/dabirebensada/Shiny_AnalysisSoftware' }] },
    { year: 2022, id: 'lilas', title: 'Gestionnaire de logiciel Scolaire ED-ADMIN', company: 'École Privée Bilingue Les Lilas', period: 'Juin 2022 - Août 2022', location: 'Ouagadougou, Burkina Faso', duration: '2 mois', tasks: ['Assistance pour le paramétrage du Logiciel ED-ADMIN', 'Chargé des admissions et des inscriptions scolaires des élèves', 'Régularisation de la saisie des absences et des présences des élèves', 'Régularisation de la saisie des notes'] }
]
const CAREER_COUNT = CAREER_EXPERIENCES.length
// --- FIN PERSONNALISATION ---

export class CareerArea extends Area
{
    constructor(references)
    {
        super(references)

        // Debug
        if(this.game.debug.active)
        {
            this.debugPanel = this.game.debug.panel.addFolder({
                title: '💼 Career',
                expanded: false,
            })
        }

        this.setSounds()
        this.setLines()
        this.setYears()
        this.setAchievement()
        this.setInteractivePoints()
        this.hidePlaceholdersAndRectangles()
        // Rappel au prochain frame au cas où le modèle 3D n’est pas encore totalement attaché
        const cb = () => { this.game.ticker.events.off('tick', cb); this.hidePlaceholdersAndRectangles() }
        this.game.ticker.events.on('tick', cb)
    }

    // Masque les rectangles blancs (Plane.018, .022, .030, .035, .048, .049) du GLB.
    // 5 sont enfants directs de career, 1 (Plane.030) est dans refYear.
    hidePlaceholdersAndRectangles()
    {
        const isPlane = (name) => ((name || '').toLowerCase().startsWith('plane'))

        // 1) Tout le modèle career (dont les 5 Planes enfants directs de career)
        this.model.traverse(obj =>
        {
            const n = obj.name || ''
            const nLower = n.toLowerCase()
            if (isPlane(n) || nLower.includes('placeholder') || nLower.includes('rectangle') || nLower.includes('overlay') || nLower === 'white')
                obj.visible = false
        })

        // 2) refYear contient Plane.030 : s’assurer qu’il est bien masqué (setYears a déjà été appelé)
        const yearGroup = this.year?.group
        if (yearGroup) yearGroup.traverse(obj => { if (isPlane(obj.name)) obj.visible = false })
    }

    setSounds()
    {
        this.sounds = {}
        this.sounds.stoneOut = this.game.audio.register({
            path: 'sounds/stoneSlides/stoneSlideOut.mp3',
            autoplay: false,
            loop: false,
            volume: 0.3,
            antiSpam: 0.1,
            positions: new THREE.Vector3(),
            distanceFade: 14,
            onPlay: (item, line) =>
            {
                item.positions[0].copy(line.origin)
                item.rate = 1.2 + line.index * 0.1
            }
        })
        this.sounds.stoneIn = this.game.audio.register({
            path: 'sounds/stoneSlides/stoneSlideIn.mp3',
            autoplay: false,
            loop: false,
            volume: 0.2,
            rate: 0.8,
            antiSpam: 0.1,
            positions: new THREE.Vector3(),
            distanceFade: 14,
            onPlay: (item, line) =>
            {
                item.positions[0].copy(line.origin)
                // item.rate = 0.9 + Math.random() * 0.2
            }
        })
    }

    setLines()
    {
        this.lines = {}
        this.lines.items = []
        this.lines.activeElevation = 2.5
        this.lines.padding = 0.25
        
        const lineGroups = this.references.items.get('line')

        // Ne garder que les 3 premières lignes (nos 3 expériences) et masquer le reste
        const lineGroupsToUse = lineGroups.slice(0, CAREER_COUNT)
        for(let i = CAREER_COUNT; i < lineGroups.length; i++)
            lineGroups[i].visible = false

        const colors = {
            blue: uniform(color('#5390ff')),
            orange: uniform(color('#ff8039')),
            purple: uniform(color('#b65fff')),
            green: uniform(color('#a2ffab'))
        }

        for(const group of lineGroupsToUse)
        {
            const line = {}
            line.group = group
            line.size = parseFloat(line.group.userData.size)
            line.hasEnd = line.group.userData.hasEnd
            line.color = line.group.userData.color
            line.texture = this.game.resources[`${line.group.userData.texture}Texture`]

            line.stone = line.group.children.find(child => child.name.startsWith('stone'))
            line.stone.position.y = 0
            
            line.origin = line.group.position.clone()
            
            line.isIn = false
            line.isUp = false
            line.elevationTarget = 0
            line.offsetTarget = 0
            line.labelReveal = uniform(0)

            {
                line.textMesh = line.stone.children.find(child => child.name.startsWith('careerText'))

                const material = new THREE.MeshLambertNodeMaterial({ transparent: true })
                
                const baseColor = colors[line.color]

                material.outputNode = Fn(() =>
                {
                    const baseUv = uv().toVar()

                    step(baseUv.x, line.labelReveal).lessThan(0.5).discard()

                    const textureColor = texture(line.texture, baseUv)

                    const alpha = step(0.1, max(textureColor.r, textureColor.g))

                    const emissiveColor = baseColor.div(luminance(baseColor)).mul(1.7)

                    const maskColor = color('#251f2b')
                    const finalColor = mix(maskColor, emissiveColor, textureColor.r)
                    
                    return vec4(finalColor, alpha)
                })()

                // Mesh
                line.textMesh.castShadow = false
                line.textMesh.receiveShadow = false
                line.textMesh.material = material
                // Masquer le texte d’origine (HETIC, Freelancer, etc.) : seuls les InteractivePoints affichent nos titres
                if (line.textMesh) line.textMesh.visible = false
            }

            this.lines.items.push(line)
        }

        this.lines.items.sort((a, b) => b.origin.z - a.origin.z)

        let i = 0
        for(const line of this.lines.items)
        {
            line.index = i++
        }

        // Debug
        if(this.game.debug.active)
        {
            this.game.debug.addThreeColorBinding(this.debugPanel, colors.blue.value, 'blue')
            this.game.debug.addThreeColorBinding(this.debugPanel, colors.orange.value, 'orange')
            this.game.debug.addThreeColorBinding(this.debugPanel, colors.purple.value, 'purple')
            this.game.debug.addThreeColorBinding(this.debugPanel, colors.green.value, 'green')
        }
    }

    setYears()
    {
        this.year = {}
        this.year.group = this.references.items.get('year')[0]
        this.year.originZ = this.year.group.position.z
        this.year.size = 17
        this.year.offsetTarget = 0
        this.year.start = 2025
        this.year.current = 2025

        //    Digit indexes
        //
        //      --- 0 ---
        //    |           |
        //    5           1
        //    |           |
        //      --- 6 --- 
        //    |           |
        //    4           2
        //    |           |
        //      --- 3 ---

        const a = 255

        const digitData = new Uint8Array([
            a, a, a, a, a, a, 0, // 0
            0, a, a, 0, 0, 0, 0, // 1
            a, a, 0, a, a, 0, a, // 2
            a, a, a, a, 0, 0, a, // 3
            0, a, a, 0, 0, a, a, // 4
            a, 0, a, a, 0, a, a, // 5
            a, 0, a, a, a, a, a, // 6
            a, a, a, 0, 0, 0, 0, // 7
            a, a, a, a, a, a, a, // 8
            a, a, a, a, 0, a, a, // 9
        ])

        this.year.digitsTexture = new THREE.DataTexture(
            digitData,
            7,
            10,
            THREE.RedFormat,
            THREE.UnsignedByteType,
            THREE.UVMapping,
            THREE.ClampToEdgeWrapping,
            THREE.ClampToEdgeWrapping,
            THREE.NearestFilter,
            THREE.NearestFilter
        )
        this.year.digitsTexture.generateMipmaps = false
        this.year.digitsTexture.needsUpdate = true

        this.year.digits = []

        const digitMeshes = this.year.group.children.filter(child => child.name.startsWith('digit'))

        for(const mesh of digitMeshes)
        {
            const digit = {}
            digit.mesh = mesh
            digit.indexUniform = uniform(0)
            
            const material = new THREE.MeshBasicNodeMaterial()
            material.outputNode = vec4(1.7)

            material.positionNode = Fn(() =>
            {
                const barUv = uv(1).toVar()

                const uvY = digit.indexUniform.div(10).add(float(0.5).div(10))
                barUv.y.assign(uvY)

                const barActive = texture(this.year.digitsTexture, barUv).r

                const newPosition = positionGeometry.toVar()
                newPosition.y.subAssign(barActive.oneMinus())

                return newPosition
            })()

            digit.mesh.material = material

            this.year.digits.push(digit)
        }

        this.year.updateDigits = (year = 2025) =>
        {
            const yearString = `${year}`
            let i = 0
            for(const digit of this.year.digits)
            {
                digit.indexUniform.value = parseInt(yearString[i])
                i++
            }
        }

        this.year.updateDigits(this.year.current)

        // // Test mesh
        // const mesh = new THREE.Mesh(
        //     new THREE.PlaneGeometry(2, 2),
        //     new THREE.MeshBasicMaterial({ map: this.year.digitsTexture, side: THREE.DoubleSide })
        // )
        // mesh.position.y = 4
        // mesh.position.z = -30
        // mesh.position.x = -10
        // this.game.scene.add(mesh)
    }

    setAchievement()
    {
        this.events.on('boundingIn', () =>
        {
            this.game.achievements.setProgress('areas', 'career')
        })
    }

    // --- DÉBUT PERSONNALISATION ---
    // Ajout des zones cliquables pour chaque expérience
    setInteractivePoints()
    {
        this.interactivePoints = []
        
        // Créer un point interactif pour chaque ligne/expérience
        for(let i = 0; i < Math.min(this.lines.items.length, CAREER_EXPERIENCES.length); i++)
        {
            const line = this.lines.items[i]
            const experience = CAREER_EXPERIENCES[i]
            
            // Position du point interactif (au centre de la ligne, légèrement au-dessus)
            const position = line.origin.clone()
            position.y = 1.5 // Au-dessus de la pierre
            
            // Créer le point interactif
            const interactivePoint = this.game.interactivePoints.create(
                position,
                experience.title,
                InteractivePoints.ALIGN_LEFT,
                InteractivePoints.STATE_CONCEALED,
                () =>
                {
                    // Ouvrir la modal avec les détails de l'expérience
                    this.openExperienceModal(experience)
                },
                () =>
                {
                    // Au survol : afficher le bouton interact
                    this.game.inputs.interactiveButtons.addItems(['interact'])
                },
                () =>
                {
                    // Quand on quitte : retirer le bouton
                    this.game.inputs.interactiveButtons.removeItems(['interact'])
                },
                () =>
                {
                    // Quand on cache : retirer le bouton
                    this.game.inputs.interactiveButtons.removeItems(['interact'])
                }
            )
            
            // Désactiver le point interactif par défaut, on l'activera quand la ligne est visible
            interactivePoint.intersect.active = false
            
            // Stocker la référence pour pouvoir l'activer/désactiver
            line.interactivePoint = interactivePoint
            this.interactivePoints.push(interactivePoint)
        }
    }

    openExperienceModal(experience)
    {
        // Mettre à jour le contenu de la modal
        const modal = this.game.modals.items.get('career')
        if (!modal) return

        const titleElement = modal.element.querySelector('.js-career-title')
        const companyElement = modal.element.querySelector('.js-career-company')
        const periodElement = modal.element.querySelector('.js-career-period')
        const locationElement = modal.element.querySelector('.js-career-location')
        const tasksElement = modal.element.querySelector('.js-career-tasks')
        const linksElement = modal.element.querySelector('.js-career-links')

        if (titleElement) titleElement.textContent = experience.title
        if (companyElement) companyElement.textContent = experience.company
        if (periodElement) periodElement.textContent = `${experience.period} (${experience.duration})`
        if (locationElement) locationElement.textContent = experience.location
        
        // Mettre à jour les tâches
        if (tasksElement) {
            tasksElement.innerHTML = ''
            experience.tasks.forEach(task => {
                const li = document.createElement('li')
                li.textContent = task
                tasksElement.appendChild(li)
            })
        }

        // Mettre à jour les liens
        if (linksElement) {
            linksElement.innerHTML = ''
            if (experience.links && experience.links.length > 0) {
                experience.links.forEach(link => {
                    const a = document.createElement('a')
                    a.href = link.url
                    a.target = '_blank'
                    a.rel = 'noopener noreferrer'
                    a.textContent = link.label
                    a.classList.add('link')
                    linksElement.appendChild(a)
                })
            }
        }

        // Ouvrir la modal
        this.game.modals.open('career')
    }
    // --- FIN PERSONNALISATION ---

    update()
    {
        // Lines
        for(const line of this.lines.items)
        {
            const delta = line.origin.z - this.game.player.position.z

            // Is in
            if(delta > - this.lines.padding && delta < line.size + this.lines.padding * 2)
            {
                if(!line.isIn)
                {
                    line.isIn = true
                    gsap.to(line.labelReveal, { value: 1, duration: 1, delay: 0.3, overwrite: true, ease: 'power2.inOut' })
                    // --- DÉBUT PERSONNALISATION ---
                    // Activer le point interactif quand la ligne est visible
                    if (line.interactivePoint) {
                        line.interactivePoint.intersect.active = true
                    }
                    // --- FIN PERSONNALISATION ---
                }
            }

            // Is out
            else
            {
                if(line.isIn)
                {
                    line.isIn = false
                    gsap.to(line.labelReveal, { value: 0, duration: 1, overwrite: true, ease: 'power2.inOut' })
                    // --- DÉBUT PERSONNALISATION ---
                    // Désactiver le point interactif quand la ligne n'est plus visible
                    if (line.interactivePoint) {
                        line.interactivePoint.intersect.active = false
                    }
                    // --- FIN PERSONNALISATION ---
                }
            }

            // Elevation
            if(line.isIn)
            {
                if(!line.isUp)
                {
                    line.isUp = true
                    this.sounds.stoneOut.play(line)
                }
            }
            else
            {
                if(delta > line.size)
                {
                    if(line.hasEnd)
                    {
                        if(line.isUp)
                        {
                            line.isUp = false
                            gsap.delayedCall(0.3, () =>
                            {
                                this.sounds.stoneIn.play(line)
                            })
                        }
                    }
                }
                else
                {
                    if(line.isUp)
                    {
                        line.isUp = false
                        gsap.delayedCall(0.3, () =>
                        {
                            this.sounds.stoneIn.play(line)
                        })
                    }
                }
            }

            line.elevationTarget = line.isUp ? this.lines.activeElevation : 0
            line.stone.position.y += (line.elevationTarget - line.stone.position.y) * this.game.ticker.deltaScaled * 3

            // Position
            if(line.isIn)
            {
                if(line.stone.position.y > 1)
                    line.offsetTarget = - clamp(delta, 0, line.size)
                // --- DÉBUT PERSONNALISATION ---
                // Mettre à jour la position du point interactif pour suivre la ligne
                if (line.interactivePoint) {
                    const newPosition = line.origin.clone()
                    newPosition.y = 1.5
                    newPosition.z += line.stone.position.z
                    line.interactivePoint.intersect.shape.center.copy(newPosition)
                }
                // --- FIN PERSONNALISATION ---
            }
            else
            {
                // End
                if(delta > line.size)
                    line.offsetTarget = - line.size
                // Start
                else
                    line.offsetTarget = 0
            }

            line.stone.position.z += (line.offsetTarget - line.stone.position.z) * this.game.ticker.deltaScaled * 10
        }

        // Year : l’affichage suit la ligne où se trouve la voiture (2025=SUNU, 2024=MYDATABALL, 2022=Les Lilas)
        const delta = this.year.originZ - this.game.player.position.z
        if(delta > this.year.size)
            this.year.offsetTarget = this.year.size
        else if(delta < 0)
            this.year.offsetTarget = 0
        else
            this.year.offsetTarget = delta

        const finalPositionZ = this.year.originZ - this.year.offsetTarget
        this.year.group.position.z += (finalPositionZ - this.year.group.position.z) * this.game.ticker.deltaScaled * 10

        let yearCurrent = this.year.current
        for(let i = 0; i < this.lines.items.length && i < CAREER_EXPERIENCES.length; i++)
        {
            if(this.lines.items[i].isIn)
            {
                yearCurrent = CAREER_EXPERIENCES[i].year
                break
            }
        }

        if(yearCurrent !== this.year.current)
        {
            this.year.current = yearCurrent
            this.year.updateDigits(this.year.current)
        }
    }
}