import { Game } from './Game.js'
import { uniform } from 'three/tsl'
import { Events } from './Events.js'

export class Achievements
{
    constructor()
    {
        this.game = Game.getInstance()
        this.events = new Events()

        // Groupes factices pour que les lectures this.game.achievements.groups.get(...) ne plantent pas
        this.groups = new Map()

        // Stub minimal pour les parties du monde qui lisent encore achievements.globalProgress
        this.globalProgress = {
            achieved: true,
            achievedCount: 0,
            totalCount: 1,
            ratioUniform: uniform(1),
            update: () => {},
            reset: () => {}
        }

        // Récompense factice pour la peinture du véhicule
        this.rewards = {
            current: { name: 'red' }
        }

        this.setUI()
        this.setSounds()
    }

    /**
     * Création de l’UI des compétences dans une modal dédiée (data-name="skills")
     */
    setUI()
    {
        const modal = this.game.modals.items.get('skills')
        if(!modal)
            return

        const root = modal.element
        const hardButton = root.querySelector('.js-skills-hard')
        const softButton = root.querySelector('.js-skills-soft')
        const description = root.querySelector('.js-skills-description')

        if(!hardButton || !softButton || !description)
            return

        const hardHtml = /* html */`
            <ul>
                <li>Pack Office</li>
                <li>Excel avancé (VBA, macros, Power Query)</li>
                <li>Power BI</li>
                <li>Python (Spyder, JupyterLab)</li>
                <li>R (RStudio)</li>
                <li>SAS Software</li>
                <li>Développement Web (HTML, CSS, JavaScript, PHP)</li>
                <li>NoSQL (Redis, MongoDB, Neo4j)</li>
                <li>SQL (PostgreSQL)</li>
                <li>Gestion de projet (Jira, Trello, GitHub)</li>
                <li>Statistiques et prédictions</li>
            </ul>
        `

        const softHtml = /* html */`
            <p>
                Organisé · Esprit d’analyse<br>
                Curieux · Autonome<br>
                Sociable · Rigoureux<br>
                Esprit d’équipe · Adaptabilité
            </p>
        `

        const setMode = (mode) =>
        {
            // Réinitialiser l’affichage
            hardButton.classList.remove('is-active')
            softButton.classList.remove('is-active')

            if(mode === 'hard')
            {
                hardButton.classList.add('is-active')
                description.innerHTML = hardHtml
            }
            else
            {
                softButton.classList.add('is-active')
                description.innerHTML = softHtml
            }
        }

        hardButton.addEventListener('click', () => setMode('hard'))
        softButton.addEventListener('click', () => setMode('soft'))

        // Au chargement, on ne montre aucun texte tant qu’on n’a pas cliqué
        description.innerHTML = ''
    }

    setSounds()
    {
        this.sounds = {}
        
        this.sounds.achieve = this.game.audio.register({
            path: 'sounds/achievements/Money Reward 2.mp3',
            autoplay: false,
            loop: false,
            volume: 0.4,
            antiSpam: 0.5
        })
    }

    // Méthodes d’API conservées comme no-op pour éviter tout plantage
    setProgress()
    {}

    addProgress()
    {}

    reset()
    {}
}