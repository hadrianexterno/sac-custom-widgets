(function() {
    // --- 1. WIDGET PRINCIPAL ---
    let template = document.createElement("template");
    template.innerHTML = `
        <style>
            :host { display: block; padding: 15px; font-family: Arial, sans-serif; border: 1px solid #d1d5db; border-radius: 8px; background-color: #ffffff; overflow-y: auto; height: 100%; box-sizing: border-box; }
            .chat-container { display: flex; flex-direction: column; gap: 12px; }
            .message { padding: 10px; border-radius: 6px; font-size: 14px; line-height: 1.5; }
            .system-msg { background-color: #f3f4f6; color: #374151; }
            .user-msg { background-color: #e0e7ff; color: #3730a3; border-left: 4px solid #4f46e5; }
            .gemini-msg { background-color: #f0fdf4; color: #166534; border-left: 4px solid #16a34a; }
            .error-msg { background-color: #fef2f2; color: #991b1b; border-left: 4px solid #dc2626; }
        </style>
        <div class="chat-container" id="chat">
            <div class="message system-msg"><strong>Estado:</strong> Esperando datos de la tabla de SAC...</div>
        </div>
    `;

    class GeminiWidget extends HTMLElement {
        constructor() {
            super();
            this._shadowRoot = this.attachShadow({mode: "open"});
            this._shadowRoot.appendChild(template.content.cloneNode(true));
            this._props = {};
        }

        onCustomWidgetBeforeUpdate(changedProperties) {
            this._props = { ...this._props, ...changedProperties };
        }

        onCustomWidgetAfterUpdate(changedProperties) {}

        async postMessage(message) {
            const chatDiv = this._shadowRoot.getElementById("chat");
            chatDiv.innerHTML += `<div class="message user-msg"><strong>Analizando datos...</strong></div>`;

            if (!this._props.apiKey) {
                chatDiv.innerHTML += `<div class="message error-msg"><strong>Error:</strong> No has configurado la API Key de Gemini en el panel de diseño.</div>`;
                return;
            }

            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this._props.model || 'gemini-1.5-pro'}:generateContent?key=${this._props.apiKey}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: message }] }]
                    })
                });

                const data = await response.json();

                if (data.candidates && data.candidates[0].content) {
                    let reply = data.candidates[0].content.parts[0].text;
                    reply = reply.replace(/\n/g, '<br>');
                    chatDiv.innerHTML += `<div class="message gemini-msg"><strong>Gemini:</strong><br>${reply}</div>`;
                } else if (data.error) {
                    chatDiv.innerHTML += `<div class="message error-msg"><strong>Error de API:</strong> ${data.error.message}</div>`;
                }
            } catch (error) {
                chatDiv.innerHTML += `<div class="message error-msg"><strong>Error de red:</strong> ${error.message}</div>`;
            }
            
            this._shadowRoot.host.scrollTop = this._shadowRoot.host.scrollHeight;
        }
    }

    // Registramos el widget principal
    customElements.define("com-hadrian-sap-gemini", GeminiWidget);

    // --- 2. PANEL BUILDER (La pieza que faltaba) ---
    class GeminiWidgetBuilder extends HTMLElement {
        constructor() {
            super();
            this._shadowRoot = this.attachShadow({mode: "open"});
            this._shadowRoot.innerHTML = `
                <div style="padding: 15px; font-family: Arial, sans-serif; font-size: 13px; color: #333;">
                    <strong>Configuración de Gemini</strong><br><br>
                    Por favor, configura tu API Key en el panel de Propiedades (Properties) de SAC.
                </div>
            `;
        }
    }

    // Registramos el panel builder para que SAC no dé error de timeout
    customElements.define("com-hadrian-sap-gemini-builder", GeminiWidgetBuilder);

})();
