(function() {
    let template = document.createElement("template");
    template.innerHTML = `
        <style>
            :host {
                display: block; padding: 15px; font-family: Arial, sans-serif;
                border: 1px solid #d1d5db; border-radius: 8px;
                background-color: #ffffff; overflow-y: auto;
                height: 100%; box-sizing: border-box;
            }
            .chat-container { display: flex; flex-direction: column; gap: 12px; }
            .message { padding: 10px; border-radius: 6px; font-size: 14px; line-height: 1.5; }
            .system-msg  { background-color: #f3f4f6; color: #374151; }
            .user-msg    { background-color: #e0e7ff; color: #3730a3; border-left: 4px solid #4f46e5; }
            .gemini-msg  { background-color: #f0fdf4; color: #166534; border-left: 4px solid #16a34a; }
            .error-msg   { background-color: #fef2f2; color: #991b1b; border-left: 4px solid #dc2626; }
            .btn-row     { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
            button {
                padding: 7px 14px; border: none; border-radius: 5px;
                cursor: pointer; font-size: 13px; font-weight: bold;
            }
            #btnAnalizar { background-color: #4f46e5; color: white; }
            #btnLimpiar  { background-color: #e5e7eb; color: #374151; }
        </style>
        <div class="chat-container" id="chat">
            <div class="message system-msg">
                <strong>Estado:</strong> Widget listo. Llama a <code>postMessage()</code> desde un script SAC
                o usa el botón de abajo si ya pasaste los datos.
            </div>
        </div>
        <div class="btn-row">
            <button id="btnAnalizar">Analizar tabla</button>
            <button id="btnLimpiar">Limpiar</button>
        </div>
    `;

    class GeminiWidget extends HTMLElement {
        constructor() {
            super();
            this._shadowRoot = this.attachShadow({ mode: "open" });
            this._shadowRoot.appendChild(template.content.cloneNode(true));
            this._props  = {};
            this._lastData = "";   // guarda los datos que vienen de SAC
        }

        connectedCallback() {
            this._shadowRoot.getElementById("btnAnalizar").addEventListener("click", () => {
                if (this._lastData) {
                    this.postMessage(this._lastData);
                } else {
                    this._addMsg("error-msg", "No hay datos cargados aún. Ejecuta el script SAC primero.");
                }
            });
            this._shadowRoot.getElementById("btnLimpiar").addEventListener("click", () => {
                this._shadowRoot.getElementById("chat").innerHTML =
                    `<div class="message system-msg"><strong>Chat limpiado.</strong></div>`;
            });
        }

        onCustomWidgetBeforeUpdate(changedProperties) {
            this._props = { ...this._props, ...changedProperties };
        }

        onCustomWidgetAfterUpdate(changedProperties) {}

        // MÉTODO PÚBLICO — SAC lo llama con los datos del modelo
        postMessage(message) {
            this._lastData = message;   // guarda para el botón
            this._runGemini(message);
        }

        _addMsg(cssClass, html) {
            const chat = this._shadowRoot.getElementById("chat");
            const div  = document.createElement("div");
            div.className = `message ${cssClass}`;
            div.innerHTML = html;
            chat.appendChild(div);
            this._shadowRoot.host.scrollTop = this._shadowRoot.host.scrollHeight;
        }

        async _runGemini(message) {
            // Eliminamos la validación del panel de diseño, pasa directo a procesar
            this._addMsg("user-msg", "<strong>Datos enviados a Gemini...</strong>");

            // ✅ INSERTA TU LLAVE AQUÍ, DIRECTO EN GITHUB
            const MI_LLAVE_GEMINI = "PEGA_TU_LLAVE_AQUI";

            const model = this._props.model || "gemini-2.0-flash";
            const url   = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${MI_LLAVE_GEMINI}`;

            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: message }]
                        }],
                        generationConfig: {
                            temperature: this._props.temperature || 0.2
                        }
                    })
                });

                const data = await response.json();

                if (data.candidates && data.candidates[0].content) {
                    let reply = data.candidates[0].content.parts[0].text;
                    reply = reply.replace(/\n/g, "<br>");
                    this._addMsg("gemini-msg", `<strong>Gemini:</strong><br>${reply}`);
                } else if (data.error) {
                    this._addMsg("error-msg", `<strong>Error API:</strong> ${data.error.message}`);
                } else {
                    this._addMsg("error-msg", `<strong>Respuesta inesperada:</strong> ${JSON.stringify(data)}`);
                }
            } catch (error) {
                this._addMsg("error-msg", `<strong>Error de red:</strong> ${error.message}`);
            }
        }
    }

    customElements.define("com-hadrian-sap-gemini", GeminiWidget);

    // --- BUILDER (Panel de Diseño Limpio) ---
    class GeminiWidgetBuilder extends HTMLElement {
        constructor() {
            super();
            this._shadowRoot = this.attachShadow({ mode: "open" });
            this._shadowRoot.innerHTML = `
                <div style="padding:15px; font-family:Arial,sans-serif; font-size:13px; color:#333;">
                    <strong>Configuración de Gemini</strong><br><br>
                    <p style="color: #16a34a; font-weight: bold;">✓ API Key incrustada en el código</p>
                    <label style="font-weight:bold;">Modelo:</label><br>
                    <select id="model" style="width:100%;padding:6px;margin-top:6px;border:1px solid #ccc;border-radius:4px;">
                        <option value="gemini-2.0-flash">gemini-2.0-flash (recomendado)</option>
                        <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                        <option value="gemini-2.0-pro-exp">gemini-2.0-pro-exp</option>
                    </select>
                </div>
            `;
        }

        set model(v)  { this._shadowRoot.getElementById("model").value = v || "gemini-2.0-flash"; }
        get model()   { return this._shadowRoot.getElementById("model").value; }

        connectedCallback() {
            const dispatch = () => this.dispatchEvent(new CustomEvent("propertiesChanged", {
                detail: { properties: { model: this.model } }
            }));
            this._shadowRoot.getElementById("model").addEventListener("change", dispatch);
        }
    }

    customElements.define("com-hadrian-sap-gemini-builder", GeminiWidgetBuilder);
})();
