import { Events } from './Events.js'
import { Game } from './Game.js'

export class Quality
{
    constructor()
    {
        this.game = Game.getInstance()

        this.events = new Events()

        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        
        // --- DÉBUT DE LA CORRECTION ---
        // Détection automatique de performance pour ajuster la qualité
        // Si c'est un mobile, on met directement en Low
        // Sinon, on détecte les performances pour éviter les problèmes au démarrage
        if (isMobile) {
            this.level = 1 // Low quality pour mobile
        } else {
            // Détection de performance basée sur le hardware
            // On vérifie si WebGPU est disponible et les capacités du GPU
            const canvas = document.createElement('canvas')
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
            
            if (!gl) {
                // Pas de WebGL, on force Low
                this.level = 1
            } else {
                // On récupère les informations du GPU
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
                const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : ''
                
                // Détection de GPU intégré ou faible performance
                const isLowEndGPU = renderer && (
                    renderer.includes('Intel') && !renderer.includes('Iris') && !renderer.includes('UHD 6') ||
                    renderer.includes('Mali') ||
                    renderer.includes('Adreno 3') ||
                    renderer.includes('PowerVR')
                )
                
                // Détection de faible mémoire GPU (approximative)
                const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
                const isLowMemory = maxTextureSize < 4096
                
                // Si GPU faible ou mémoire limitée, on démarre en Low
                // L'utilisateur pourra toujours passer en High manuellement
                this.level = (isLowEndGPU || isLowMemory) ? 1 : 0
                
                if (this.level === 1) {
                    console.info('Quality.js : Détection automatique - Qualité réglée en "Low" pour de meilleures performances. Vous pouvez la changer dans les paramètres.')
                }
            }
        }
        // --- FIN DE LA CORRECTION ---

        // Debug
        if(this.game.debug.active)
        {
            const debugPanel = this.game.debug.panel.addFolder({
                title: '⚙️ Quality',
                expanded: false,
            })

            this.game.debug.addButtons(
                debugPanel,
                {
                    low: () =>
                    {
                        this.changeLevel(1)
                    },
                    high: () =>
                    {
                        this.changeLevel(0)
                    },
                },
                'change'
            )
        }
    }

    changeLevel(level = 0)
    {
        // Same
        if(level === this.level)
            return
            
        this.level = level
        this.events.trigger('change', [ this.level ])
    }
}