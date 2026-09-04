
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
        import { getDatabase, ref, set, onValue, update, remove, get, query, orderByChild, equalTo, runTransaction, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

        // --- LÓGICA DE ROLES (MODO SUPERVISOR Y OPERADOR) ---
        window.abrirModal = function (id) {
            const modal = document.getElementById(id);
            if (modal) modal.style.display = 'flex';
        };

        window.cerrarModal = function (id) {
            const modal = document.getElementById(id);
            if (modal) modal.style.display = 'none';
        };

        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode') || 'supervisor';

        if (mode === 'callcenter') {
            document.getElementById('main-container').style.display = 'none';
            document.getElementById('callcenter-view').style.display = 'flex';
            document.body.style.background = '#1a1a2e';
            window.isCallCenter = true;

            // Frases Motivacionales
            const frases = [
                "¡Cada entrega cuenta, vamos por más!",
                "El éxito es la suma de pequeños esfuerzos diarios.",
                "¡Hoy es un gran día para romper récords!",
                "Tu compromiso hace la diferencia. ¡Sigamos adelante!",
                "Calidad y rapidez, nuestra marca personal. ¡Vamos!",
                "Juntos llegamos más lejos. ¡Vamos por todas!",
                "La meta está cerca, ¡sigue así!",
                "¡Haz que hoy valga la pena!",
                "Energía positiva y muchas entregas. ¡Dale!",
                
                "No hay límites cuando trabajamos en equipo.",
                "¡Enfocados en la meta, imparables hoy!",
                "Pasión por lo que hacemos. ¡Buen turno equipo!",
                "¡Tu esfuerzo es el motor de Pez Postre!",
                "Constancia y dedicación: la clave del éxito."
            ];
            const hoy = new Date();
            const index = (hoy.getDate() + hoy.getMonth()) % frases.length;
            const elMotiv = document.getElementById('cc-motivation');
            if (elMotiv) elMotiv.innerText = frases[index];

        } else {
            window.isCallCenter = false;
        }

        // Verificación de Autenticidad (Seguridad por URL y Persistencia de 9 Horas)
        function isAuthValid(role) {
            if (role === 'callcenter') return true;
            const authStr = localStorage.getItem('auth_' + role);
            if (!authStr) return false;
            try {
                const authData = JSON.parse(authStr);
                const now = Date.now();
                const nineHours = 9 * 60 * 60 * 1000;
                return (now - authData.timestamp) < nineHours;
            } catch (e) {
                return false;
            }
        }

        let authed = isAuthValid(mode);

        // Si no está autenticado, el "modo efectivo" vuelve a ser operador para el renderizado inicial
        window.modeEfectivo = authed ? mode : 'supervisor';
        window.isOperador = false;
        window.isSupervisor = true;
        window.isAdmin = window.modeEfectivo === 'admin';
        window.targetRole = "";
        window.sessionId = localStorage.getItem('domifaster_session_id') || "";

        // Aplicar restricciones según el rol
        document.getElementById('titulo-panel').style.display = 'none';

        window.accesoLogin = function (role) {
            window.targetRole = role;
            const icon = document.getElementById('loginIcon');
            const title = document.getElementById('loginTitle');
            if (role === 'admin') {
                icon.innerHTML = '<i class="fas fa-user-cog"></i>';
                title.innerText = 'Acceso Administrador';
            } else {
                icon.innerHTML = '<i class="fas fa-user-shield"></i>';
                title.innerText = 'Acceso Supervisor';
            }

            abrirModal('modalLogin');

            // Si el usuario cancela el login forzado (clic fuera), volvemos a operador
            document.getElementById('modalLogin').onclick = function (e) {
                if (e.target === this) {
                    window.cancelarLogin();
                }
            };

            setTimeout(() => {
                const input = document.getElementById('passSupervisor');
                if (input) {
                    input.value = "";
                    input.focus();
                }
            }, 100);
        };

        window.cancelarLogin = function () {
            // Si el modo actual no está autenticado y se cierra el modal
            if (!isAuthValid(mode)) {
                if (mode !== 'supervisor') {
                    window.location.search = "mode=supervisor";
                } else {
                    window.location.reload();
                }
            } else {
                cerrarModal('modalLogin');
            }
        };

        window.seleccionarSedeOperador = function (sede) {
            window.sedeSeleccionada = sede;
            sessionStorage.setItem('domifaster_sede', sede);
            sessionStorage.setItem('domifaster_sede_activa', 'true');
            cerrarModal('modalSeleccionSede');
            aplicarFiltroSedeUI();
            render();

            Swal.fire({
                icon: 'success',
                title: `Sede ${sede} Activada`,
                text: 'Tu panel ha sido configurado para esta sede.',
                timer: 2000,
                showConfirmButton: false
            });
        };

        window.cambiarRol = function (nuevoRol) {
            if (isAuthValid(nuevoRol)) {
                window.location.search = `?mode=${nuevoRol}`;
            } else {
                window.accesoLogin(nuevoRol);
            }
        };

        window.validarAccesoSupervisor = function () {
            const pass = document.getElementById('passSupervisor').value;
            let passCorrecta = "2026+ISADF";
            if (window.targetRole === 'admin') passCorrecta = "Admin2026ISADF/";
            

            if (pass === passCorrecta) {
                const sId = "sess_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
                const authData = {
                    authenticated: true,
                    timestamp: Date.now(),
                    sessionId: sId
                };
                localStorage.setItem('auth_' + window.targetRole, JSON.stringify(authData));
                localStorage.setItem('domifaster_session_id', sId);

                

                window.location.search = `?mode=${window.targetRole}`;
            } else {
                const input = document.getElementById('passSupervisor');
                if (input) {
                    input.style.borderColor = 'var(--danger)';
                    input.style.animation = 'shake 0.4s';
                    setTimeout(() => {
                        input.style.animation = '';
                    }, 400);
                }
            }
        };

        function aplicarPermisosUI() {
            // Si intenta entrar a modo protegido sin auth, forzar login
            if (!authed) { window.abrirModal('modalRoleSelection'); }

            // Usamos modeEfectivo para las labels y UI
            const badgeLogo = document.getElementById('admin-badge-logo');
            if (badgeLogo) {
                if (modeEfectivo === 'admin') {
                    badgeLogo.style.display = 'block';
                    badgeLogo.innerText = 'ADMIN';
                    badgeLogo.style.background = '#ef4444';
                    badgeLogo.style.color = 'white';
                    badgeLogo.style.borderColor = '#b91c1c';
                    badgeLogo.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.4)';
                } else if (modeEfectivo === 'supervisor') {
                    badgeLogo.style.display = 'block';
                    badgeLogo.innerText = 'SUPERVISOR';
                    badgeLogo.style.background = '#3b82f6';
                    badgeLogo.style.color = 'white';
                    badgeLogo.style.borderColor = '#1d4ed8';
                    badgeLogo.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.4)';
                } else {
                    badgeLogo.style.display = 'block';
                    badgeLogo.innerText = 'OPERADOR';
                    badgeLogo.style.background = '#64748b';
                    badgeLogo.style.color = 'white';
                    badgeLogo.style.borderColor = '#475569';
                    badgeLogo.style.boxShadow = '0 0 10px rgba(100, 116, 139, 0.4)';
                }
            }

            // Gestión de inputs y botones de agregar (A solicitud, Operador también puede agregar)
            const inputNombre = document.getElementById('nombreInput');
            const btnAgregar = document.getElementById('btn-agregar');
            if (inputNombre) {
                inputNombre.disabled = false;
                inputNombre.placeholder = "Nombre domiciliario...";
            }
            if (btnAgregar) btnAgregar.style.display = 'flex';

            // Ocultar funciones exclusivas de ADMIN
            const adminOnlyElements = ['btn-semanales', 'btn-gestion-personal', 'btn-exportar-excel', 'btn-borrar-todo'];
            adminOnlyElements.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = window.isAdmin ? 'flex' : 'none';
            });

            // Ocultar el botón general de reportes si no es admin
            

            // Gestión de sedes para Operadores
            const btnSedeTodas = document.getElementById('btn-sede-todas');
            const branchCounters = document.querySelector('.branch-counters');

            if (false) { } else {
                // Supervisor/Admin ven todo
                if (btnSedeTodas) btnSedeTodas.style.display = 'flex';
                if (branchCounters) {
                    branchCounters.style.pointerEvents = 'auto';
                    document.querySelectorAll('.branch-stat').forEach(el => el.style.display = 'flex');
                }
            }

            // --- ACTUALIZACIÓN VISUAL BOTONES ROL ---
            document.querySelectorAll('.btn-system-role').forEach(btn => {
                btn.classList.remove('active', 'role-admin', 'role-supervisor');
            });
            const activeBtn = document.getElementById(`btn-role-${window.modeEfectivo}`);
            if (activeBtn) {
                activeBtn.classList.add('active');
                if (window.modeEfectivo === 'admin') activeBtn.classList.add('role-admin');
                if (window.modeEfectivo === 'supervisor') activeBtn.classList.add('role-supervisor');
            }
        }

        aplicarPermisosUI();

        // --- LÓGICA DE SEDES ---
        window.sedeSeleccionada = sessionStorage.getItem('domifaster_sede') || 'Todas';

        window.cambiarVistaSede = function (sede) {
            window.sedeSeleccionada = sede;
            sessionStorage.setItem('domifaster_sede', sede);
            aplicarFiltroSedeUI();
            render();
        };

        function aplicarFiltroSedeUI() {
            document.querySelectorAll('.branch-stat').forEach(el => el.classList.remove('active'));
            const id = `btn-sede-${window.sedeSeleccionada.toLowerCase()}`;
            const btn = document.getElementById(id);
            if (btn) btn.classList.add('active');

            // Actualizar etiqueta de sede actual para operadores
            const badge = document.getElementById('sede-activa-badge');
            const texto = document.getElementById('nombre-sede-texto');
            if (badge && texto) {
                if (window.isOperador && window.sedeSeleccionada !== 'Todas') {
                    badge.style.display = 'flex';
                    texto.innerText = `Sede ${window.sedeSeleccionada}`;
                } else {
                    badge.style.display = 'none';
                }
            }
        }

        // Ejecutar inicialmente
        setTimeout(aplicarFiltroSedeUI, 100);

                const firebaseConfig = {
            apiKey: "AIzaSyA4cj7DYrl5UKlBCg2G5bMay-P1t0mTO3Y",
            authDomain: "ld-isa.firebaseapp.com",
            databaseURL: "https://ld-isa-default-rtdb.firebaseio.com",
            projectId: "ld-isa",
            storageBucket: "ld-isa.firebasestorage.app",
            messagingSenderId: "304077437118",
            appId: "1:304077437118:web:3fa5386e035b56d53b06ef"
        };

        const app = initializeApp(firebaseConfig);
        const db = getDatabase(app);
        const domRef = ref(db, 'domiciliarios');
        const maestroRef = ref(db, 'personal_maestro');
        const historialRef = ref(db, 'historial');
        const deduccionesRef = ref(db, 'deducciones_semanales');
        
                }
            });
        }

        let domiciliarios = [];
        let personalMaestro = [];
        let maestroMap = new Map(); // Para búsquedas rápidas O(1)
        let historialData = [];
        let historialData_raw = {}; // Versión original (objeto) para reparaciones

        let deduccionesSemanales = {};
        
        let editIdMaestro = null;
        let filtroEstado = 'todos';
        let renderTimeout = null;

        // --- ACTUALIZACIÓN DE RELOJ EN TIEMPO REAL ---
        function updateLiveClock() {
            const ahora = new Date();
            const timeStr = ahora.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
            const dateStr = ahora.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

            const txtTime = document.getElementById("txt-time");
            const txtDate = document.getElementById("txt-date");
            if (txtTime) txtTime.innerText = timeStr;
            if (txtDate) txtDate.innerText = dateStr;

            const ccTime = document.getElementById("cc-time");
            const ccDate = document.getElementById("cc-date");
            if (ccTime) ccTime.innerText = timeStr;
            if (ccDate) ccDate.innerText = dateStr;
        }
        setInterval(updateLiveClock, 1000);
        updateLiveClock();

        const norm = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const normalize = norm;

        // Mapeo de nombres actualizados (Normalizado para evitar fallos por tildes/eñes)
        const aliasMapRaw = {
            "andres valencia": "andres",
            "mateo avendaño": "avendaño",
            "camilo mejia": "camilo",
            "daniel jaramillo": "daniel",
            "darwin urdaneta": "darwin",
            "freddy tobon": "fredy",
            "freywin lopez": "freywin",
            "yadison murillo": "jadison",
            "yess suarez": "yessi",
            "edwin rodriguez": "edwin"
        };
        const aliasMap = {};
        Object.entries(aliasMapRaw).forEach(([k, v]) => {
            aliasMap[norm(k)] = norm(v);
        });

        function buscarEnMaestro(nombre) {
            const n = norm(nombre);
            // Buscar directo
            let m = personalMaestro.find(p => norm(p.nombre) === n);
            if (m) return m;
            // Buscar por alias
            const alias = aliasMap[n];
            if (alias) return personalMaestro.find(p => norm(p.nombre) === alias);
            // Buscar a la inversa
            return personalMaestro.find(p => {
                const pNorm = norm(p.nombre);
                return aliasMap[pNorm] === n;
            });
        }

        // --- SISTEMA DE RENDERIZADO OPTIMIZADO (THROTTLED) ---
        window.render = function () {
            if (renderTimeout) return;
            renderTimeout = setTimeout(() => {
                try {
                    renderContent();
                } catch (error) {
                    console.error("Error crítico en renderizado:", error);
                } finally {
                    renderTimeout = null;
                }
            }, 50); // Máximo 20 renders por segundo
        }

        // --- UTILIDAD PARA FORMATEAR TELÉFONOS COMPATIBLES CON WHATSAPP ---
        function limpiarNumero(num) {
            if (!num) return "";
            let clean = num.toString().replace(/\D/g, "");
            // Eliminar ceros a la izquierda (común en algunos números)
            clean = clean.replace(/^0+/, "");
            // Si tiene 10 dígitos (formato celular Col), agregar el 57
            if (clean.length === 10) return "57" + clean;
            // Si tiene 12 dígitos y empieza por 57, asumimos que está bien
            if (clean.length === 12 && clean.startsWith("57")) return clean;
            // Si tiene 11 dígitos y empieza por 3 (omisión del 57 pero incluye un extra?), 
            // intentamos corregir si el extra es un prefijo viejo
            if (clean.length === 11 && clean.startsWith("57")) return clean.substring(1); // Casos extraños

            return clean;
        }

        // --- FUNCIÓN PARA ABRIR WHATSAPP DE FORMA SEGURA ---
        function abrirEnlaceWhatsApp(numero, mensaje) {
            const finalNum = limpiarNumero(numero);
            if (!finalNum || finalNum.length < 10) {
                alert("⚠️ El número de teléfono no es válido o está incompleto.");
                return;
            }
            const url = `https://api.whatsapp.com/send?phone=${finalNum}&text=${mensaje}`;

            // Usar un enlace temporal para evitar bloqueadores de pop-ups
            const link = document.createElement("a");
            link.href = url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        // --- UTILIDAD PARA CÁLCULO DE TIEMPO POR STRINGS (SOLUCIÓN A INCONSISTENCIAS DE DB) ---
        function obtenerMinutosEntre(ingreso, salida) {
            if (!ingreso || !salida || ingreso === "--:--" || salida === "--:--") return 0;
            const parsear = (str) => {
                const match = str.match(/(\d+):(\d+)\s*(AM|PM)/i);
                if (!match) return null;
                let hrs = parseInt(match[1]);
                let mins = parseInt(match[2]);
                const ampm = match[3].toUpperCase();
                if (ampm === "PM" && hrs < 12) hrs += 12;
                if (ampm === "AM" && hrs === 12) hrs = 0;
                return hrs * 60 + mins;
            };
            const mIng = parsear(ingreso);
            const mSal = parsear(salida);
            if (mIng === null || mSal === null) return 0;
            let dif = mSal - mIng;
            if (dif < 0) dif += 1440; // Caso cruce de medianoche
            return dif;
        }

        // --- FUNCIÓN DE CONFIRMACIÓN PERSONALIZADA ---
        window.confirmarAccion = function (obj) {
            return new Promise((resolve) => {
                const modal = document.getElementById('modalConfirmar');
                const title = document.getElementById('confirmTitle');
                const text = document.getElementById('confirmText');
                const icon = document.getElementById('confirmIcon');
                const btnSi = document.getElementById('btnConfirmarSi');
                const btnNo = document.getElementById('btnConfirmarNo');

                title.innerText = obj.titulo || "¿Estás seguro?";
                text.innerText = obj.texto || "";
                btnSi.innerText = obj.botonSi || "Confirmar";
                btnSi.style.backgroundColor = obj.color || 'var(--primary)';
                btnSi.style.color = 'white';
                icon.innerHTML = obj.icono || '<i class="fas fa-question-circle" style="color:var(--primary)"></i>';

                modal.style.display = 'flex';

                const handleResponse = (val) => {
                    modal.style.display = 'none';
                    resolve(val);
                };

                btnSi.onclick = () => handleResponse(true);
                btnNo.onclick = () => handleResponse(false);
            });
        };

        // --- LÓGICA DE CÁLCULO ESTÁNDAR ---
        function calcularLiquidacion(d) {
            const coordinadoresNames = ["Cristian Muñoz", "Andres Muñoz", "Nilton Cardona"];
            const lideresNames = ["Jhon Vega", "Kevin Villada"];
            const nameNorm = norm(d.nombre);

            const isCoord = coordinadoresNames.some(n => norm(n) === nameNorm);
            const isLid = lideresNames.some(n => norm(n) === nameNorm);
            const isIndrive = nameNorm.includes("indrive");

            // Salario Base (Dinámico para Liquidación Semanal y Dashboard)
            let currentSal = d.salario;
            if (!currentSal || currentSal.trim() === "") {
                const m = personalMaestro.find(p => normalize(p.nombre) === nameNorm);
                if (m) currentSal = m.salario;
            }
            let baseDaily = (currentSal && currentSal.trim() !== "") ? parseInt(currentSal.replace(/\D/g, "")) : 100000;

            let valBase = 0;
            if (isCoord || isLid) {
                valBase = baseDaily;
            } else if (!isIndrive && d.inicioLaboral && d.inicioLaboral !== "--:--") {
                valBase = baseDaily;
            }

            // Extras por tiempo (Basado en los textos de ingreso/salida)
            let valExtra = 0;
            let minsExtra = 0;
            let totalMins = 0;

            if (!isIndrive) {
                let shiftStart = d.inicioLaboral;
                let shiftEnd = d.finLaboral;

                // Fallbacks para Coordinadores/Lideres si no hay registro manual
                if (isCoord || isLid) {
                    if (!shiftStart || shiftStart === "--:--") shiftStart = "08:00 AM";
                    if (!shiftEnd || shiftEnd === "--:--") shiftEnd = "04:30 PM";
                }

                totalMins = obtenerMinutosEntre(shiftStart, shiftEnd);
                if (totalMins > 510) {
                    const extraMin = totalMins - 510;
                    const totalHalfHours = Math.floor(extraMin / 30);
                    const fullHours = Math.floor(totalHalfHours / 2);
                    const remainingHalfHours = totalHalfHours % 2;
                    valExtra = (fullHours * 15000) + (remainingHalfHours * 7000);
                    minsExtra = totalHalfHours * 30;
                }
            }

            const valBono = 0; const ent = 0;

            return {
                base: valBase,
                extras: valExtra,
                bono: valBono,
                total: valBase + valExtra + valBono,
                minsTrabajados: totalMins,
                minsExtra: minsExtra,
                
                
                isCoord, isLid, isIndrive
            };
        }

        // Monitoreo de conexión y desfase de tiempo
        let serverOffset = 0;
        onValue(ref(db, ".info/serverTimeOffset"), (snap) => {
            serverOffset = snap.val() || 0;
        });
        const getServerNow = () => Date.now() + serverOffset;

        const connectedRef = ref(db, ".info/connected");
        onValue(connectedRef, (snap) => {
            const badge = document.getElementById('connection-status');
            const text = document.getElementById('status-text');
            if (snap.val() === true) {
                badge.classList.add('online');
                text.innerText = "Sincronizado";
            } else {
                badge.classList.remove('online');
                text.innerText = "Desconectado";
            }
        });

        onValue(deduccionesRef, (snap) => {
            deduccionesSemanales = snap.val() || {};
        });

        onValue(domRef, (snapshot) => {
            const data = snapshot.val();
            let tempArray = [];

            if (data) {
                if (Array.isArray(data)) {
                    tempArray = data.map((obj, idx) => {
                        if (!obj) return null;
                        return { ...obj, id: obj.id !== undefined ? obj.id : idx };
                    }).filter(Boolean);
                } else {
                    tempArray = Object.entries(data).map(([key, obj]) => {
                        if (!obj) return null;
                        return { ...obj, id: obj.id !== undefined ? obj.id : key };
                    }).filter(Boolean);
                }
            }

            // --- SINCRONIZACIÓN CON PROTECCIÓN ANTI-FLICKER ---
            const ahoraSync = Date.now();
            const nuevosIds = new Set(tempArray.map(d => String(d.id)));

            // Fusionar datos del servidor con actualizaciones locales muy recientes (Optimismo de 1s)
            const baseFusionada = tempArray.map(serverDomi => {
                const local = domiciliarios.find(ld => String(ld.id) === String(serverDomi.id));
                if (local && local._localUpdate && (ahoraSync - local._localUpdate) < 1000) {
                    return { ...serverDomi, ...local, _fromServer: true };
                }
                return serverDomi;
            });

            // Limpiar marcas de pendiente y recuperar registros nuevos que aún no están en el servidor
            domiciliarios.forEach(d => {
                if (nuevosIds.has(String(d.id))) delete d._pendiente;
            });

            const pendientesLocal = domiciliarios.filter(d =>
                d._pendiente &&
                !nuevosIds.has(String(d.id)) &&
                (ahoraSync - d.id) < 5000
            );

            // Lista final sincronizada
            domiciliarios = [...baseFusionada, ...pendientesLocal];

            // --- DETECCIÓN DE DATOS DE DÍAS ANTERIORES (AUTO-RESET) ---
            if (isSupervisor && tempArray.length > 0) {
                const ahoraGlobal = getServerNow();
                const hoy = new Date(ahoraGlobal);
                
                // Buscamos si hay registros que NO sean de hoy
                const hayViejos = tempArray.some(d => {
                    if (!d.turnoTimestamp) return false;
                    const dDate = new Date(d.turnoTimestamp);
                    return dDate.getDate() !== hoy.getDate() || 
                           dDate.getMonth() !== hoy.getMonth() || 
                           dDate.getFullYear() !== hoy.getFullYear();
                });

                if (hayViejos && !window._staleDataPromptShown) {
                    window._staleDataPromptShown = true;
                    setTimeout(() => {
                        Swal.fire({
                            title: '¡Datos de ayer detectados!',
                            text: 'Se han detectado domiciliarios con registros de un día anterior. ¿Deseas archivar estos datos y limpiar el panel para iniciar la jornada de hoy?',
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonText: 'Sí, Archivar y Limpiar',
                            cancelButtonText: 'No, mantener datos',
                            confirmButtonColor: 'var(--danger)',
                            cancelButtonColor: '#adb5bd',
                            allowOutsideClick: false
                        }).then((result) => {
                            if (result.isConfirmed) {
                                window.borrarTodo(true); // Pasar true para saltar la segunda confirmación
                            }
                        });
                    }, 1000); // Pequeño delay para que no aparezca de inmediato al cargar
                }
            }

            // --- SISTEMA DE MIGRACIÓN PROFUNDA (Solo si es necesario) ---
            if (isSupervisor && tempArray.length > 0) {
                let updatesMigration = {};
                const ahoraGlobal = getServerNow();

                domiciliarios.forEach((d, index) => {
                    if (!d) return;
                    let changed = false;

                    if (!d.id) {
                        d.id = ahoraGlobal + index;
                        updatesMigration[`${d.id}/id`] = d.id;
                        changed = true;
                    }
                    if (!d.turnoTimestamp) {
                        d.turnoTimestamp = ahoraGlobal;
                        updatesMigration[`${d.id}/turnoTimestamp`] = d.turnoTimestamp;
                        changed = true;
                    }
                });

                if (Object.keys(updatesMigration).length > 0) {
                    console.log("Normalizando datos estructurales (Deep Update)...");
                    update(domRef, updatesMigration);
                }
            }
            
            render();
        }, (error) => {
            console.error("Error cargando domiciliarios:", error);
            if (error.message.includes("permission_denied")) {
                alert("⚠️ ERROR DE PERMISOS: Las reglas de acceso de tu Firebase han expirado. Por favor revisa la consola de Firebase.");
            }
        });

        onValue(maestroRef, (snapshot) => {
            const data = snapshot.val();
            personalMaestro = data ? (Array.isArray(data) ? data.filter(i => i) : Object.values(data)) : [];
            // Reconstruir el mapa para búsquedas instantáneas
            maestroMap.clear();
            personalMaestro.forEach(p => {
                if (p && p.nombre) maestroMap.set(norm(p.nombre), p);
            });
            render();
        }, (error) => console.error("Error cargando maestro:", error));

        onValue(historialRef, (snapshot) => {
            const data = snapshot.val();
            historialData_raw = data || {}; // Guardar copia raw para Reparar Historial
            let tempArray = [];
            if (data) {
                // Preservar llaves (IDs) al convertir a array
                Object.entries(data).forEach(([key, val]) => {
                    if (val) tempArray.push({ id: key, ...val });
                });
            }
            historialData = tempArray;

            // Patch Camilo 12/04/2026 ($50,000)
            const diaCamilo = "12/4/2026"; // Probar formato sin ceros tmb
            const diaCamiloAlt = "12/04/2026";
            const diaFound = historialData.find(h => h.fecha === diaCamilo || h.fecha === diaCamiloAlt);

            const entryPatch = {
                n: "Camilo Mejía", e: 0, t: 0, tot: 50000, h: 0, hx: 0, ing: "Manual", fin: "Manual"
            };

            if (diaFound) {
                const yaTiene = diaFound.detalle && diaFound.detalle.find(d => (d.n || "").toLowerCase().includes("camilo"));
                if (!yaTiene) {
                    const dLocal = diaFound.detalle || [];
                    dLocal.push(entryPatch);
                    update(ref(db, `historial/${diaFound.id}`), { detalle: dLocal });
                }
            } else {
                // Crear el día si no existe (utilizando el timestamp de domingo 12 abril)
                const ts = new Date(2026, 3, 12, 12, 0, 0).getTime();
                set(ref(db, `historial/${ts}`), {
                    fecha: diaCamilo,
                    timestamp: ts,
                    detalle: [entryPatch]
                });
            }
        }, (error) => console.error("Error cargando historial:", error));

        let currentSuggestIdx = -1;

        window.actualizarSugestiones = function (filtro = "") {
            const box = document.getElementById('suggestions-box');
            if (filtro.trim().length === 0) {
                box.style.display = 'none';
                return;
            }

            const filtrados = personalMaestro.filter(p =>
                norm(p.nombre).includes(norm(filtro))
            ).slice(0, 8); // Máximo 8 sugerencias

            if (filtrados.length === 0) {
                box.style.display = 'none';
                return;
            }

            let html = "";
            filtrados.forEach((p, index) => {
                html += `
                    <div class="suggestion-item" onclick="seleccionarDomi('${p.nombre.replace("'", "\\'")}')" id="sug-${index}">
                        <div class="suggestion-info">
                            <span class="suggestion-name">${p.nombre}</span>
                            <div class="suggestion-meta">
                                <span><i class="fas fa-building"></i> ${p.sede || 'Sin sede'}</span>
                                ${p.placa ? `<span><i class="fas fa-motorcycle"></i> ${p.placa}</span>` : ''}
                            </div>
                        </div>
                        <div class="suggestion-btn"><i class="fas fa-plus"></i></div>
                    </div>
                `;
            });

            box.innerHTML = html;
            box.style.display = 'block';
            currentSuggestIdx = -1;
        };

        window.seleccionarDomi = function (nombre) {
            const input = document.getElementById('nombreInput');
            input.value = nombre;
            document.getElementById('suggestions-box').style.display = 'none';
            agregar();
        };

        window.manejarTecladoSugerencias = function (e) {
            const box = document.getElementById('suggestions-box');
            const items = box.querySelectorAll('.suggestion-item');

            if (box.style.display === 'block') {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    currentSuggestIdx = (currentSuggestIdx + 1) % items.length;
                    actualizarSeleccionVisual(items);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    currentSuggestIdx = (currentSuggestIdx - 1 + items.length) % items.length;
                    actualizarSeleccionVisual(items);
                } else if (e.key === 'Enter' && currentSuggestIdx !== -1) {
                    e.preventDefault();
                    items[currentSuggestIdx].click();
                } else if (e.key === 'Escape') {
                    box.style.display = 'none';
                }
            } else if (e.key === 'Enter') {
                agregar();
            }
        };

        function actualizarSeleccionVisual(items) {
            items.forEach((item, idx) => {
                if (idx === currentSuggestIdx) {
                    item.classList.add('selected');
                    item.scrollIntoView({ block: 'nearest' });
                } else {
                    item.classList.remove('selected');
                }
            });
        }

        // Cerrar sugerencias al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-area')) {
                document.getElementById('suggestions-box').style.display = 'none';
            }
        });

        // Re-mappear la función vieja por compatibilidad si se usa en otros lados
        window.actualizarDatalist = window.actualizarSugestiones;

        async function guardar(d) {
            if (!d || !d.id) return;
            d._localUpdate = Date.now();
            const cleanData = { ...d };
            delete cleanData._localUpdate;
            delete cleanData._pendiente;
            delete cleanData._fromServer;

            try {
                const targetRef = ref(db, `domiciliarios/${d.id}`);
                await update(targetRef, cleanData);
            } catch (error) {
                console.error("Error al guardar:", error);
            }
        }

        async function guardarConTransaccion(id, transformFn) {
            if (!id) return;
            const targetRef = ref(db, `domiciliarios/${id}`);
            try {
                const result = await runTransaction(targetRef, (currentData) => {
                    if (currentData) {
                        const newData = transformFn({ ...currentData });
                        if (newData === undefined) return; // Abortar
                        return newData;
                    }
                    return currentData;
                });
                
                if (result.committed) {
                    // Actualizar localmente para respuesta inmediata
                    const idx = domiciliarios.findIndex(x => String(x.id) === String(id));
                    if (idx !== -1) {
                        domiciliarios[idx] = { ...domiciliarios[idx], ...result.snapshot.val(), _localUpdate: Date.now() };
                        render();
                    }
                }
            } catch (error) {
                console.error("Error en transacción para ID " + id + ":", error);
            }
        }

        async function guardarMaestro(p) {
            if (!p || !p.id) return;
            try {
                const targetRef = ref(db, `personal_maestro/${p.id}`);
                await set(targetRef, p);
            } catch (error) {
                console.error("Error al guardar maestro:", error);
            }
        }

        window.abrirModalPersonal = function () {
            document.getElementById('modalPersonal').style.display = 'flex';
            renderListaMaestra();
        };

        window.agregarPersonalMaestro = async function () {
            const fields = {
                nombre: document.getElementById('inputNombreMaestro'),
                cedula: document.getElementById('inputCedulaMaestro'),
                contacto: document.getElementById('inputContactoMaestro'),
                correo: document.getElementById('inputCorreoMaestro'),
                cuenta: document.getElementById('inputCuentaMaestro'),
                placa: document.getElementById('inputPlacaMaestro'),
                salario: document.getElementById('inputSalarioMaestro'),
                eps: document.getElementById('inputEPSMaestro'),
                arl: document.getElementById('inputARLMaestro'),
                sede: document.getElementById('inputSedeMaestro')
            };

            const btnSave = document.querySelector('button[onclick="agregarPersonalMaestro()"]');
            const nombre = fields.nombre.value.trim();
            if (!nombre) { alert("El nombre es obligatorio."); return; }

            if (editIdMaestro) {
                // Modo Edición
                const idx = personalMaestro.findIndex(p => p.id === editIdMaestro);
                if (idx !== -1) {
                    personalMaestro[idx] = {
                        ...personalMaestro[idx],
                        nombre: nombre,
                        cedula: fields.cedula.value.trim(),
                        contacto: fields.contacto.value.trim(),
                        correo: fields.correo.value.trim(),
                        cuenta: fields.cuenta.value.trim(),
                        placa: fields.placa.value.trim(),
                        salario: fields.salario.value.trim(),
                        eps: fields.eps.value.trim(),
                        arl: fields.arl.value.trim(),
                        sede: fields.sede.value
                    };
                }
                btnSave.innerHTML = '<i class="fas fa-plus"></i>';
                btnSave.style.background = 'var(--primary)';
            } else {
                // Modo Nuevo
                if (personalMaestro.some(p => p.nombre.toLowerCase() === nombre.toLowerCase())) {
                    alert("Ya existe este nombre."); return;
                }

                personalMaestro.push({
                    id: Date.now(),
                    nombre: nombre,
                    cedula: fields.cedula.value.trim(),
                    contacto: fields.contacto.value.trim(),
                    correo: fields.correo.value.trim(),
                    cuenta: fields.cuenta.value.trim(),
                    placa: fields.placa.value.trim(),
                    salario: fields.salario.value.trim(),
                    eps: fields.eps.value.trim(),
                    arl: fields.arl.value.trim(),
                    sede: fields.sede.value
                });
            }

            // Limpiar campos
            const addedObj = editIdMaestro ? personalMaestro.find(p => p.id === editIdMaestro) : personalMaestro[personalMaestro.length - 1];
            Object.values(fields).forEach(f => f.value = "");

            await guardarMaestro(addedObj);
            renderListaMaestra();
            editIdMaestro = null;
        };

        window.editarPersonalMaestro = function (id) {
            const p = personalMaestro.find(x => x.id === id);
            if (!p) return;

            document.getElementById('inputNombreMaestro').value = p.nombre || "";
            document.getElementById('inputCedulaMaestro').value = p.cedula || "";
            document.getElementById('inputContactoMaestro').value = p.contacto || "";
            document.getElementById('inputCorreoMaestro').value = p.correo || "";
            document.getElementById('inputCuentaMaestro').value = p.cuenta || "";
            document.getElementById('inputPlacaMaestro').value = p.placa || "";
            document.getElementById('inputSalarioMaestro').value = p.salario || "";
            document.getElementById('inputEPSMaestro').value = p.eps || "";
            document.getElementById('inputARLMaestro').value = p.arl || "";
            document.getElementById('inputSedeMaestro').value = p.sede || "";

            editIdMaestro = id;
            const btnSave = document.querySelector('button[onclick="agregarPersonalMaestro()"]');
            btnSave.innerHTML = '<i class="fas fa-save"></i>';
            btnSave.style.background = 'var(--success)';

            // Hacer scroll hasta arriba del modal para ver los campos
            document.querySelector('#modalPersonal .modal-content').scrollTo({ top: 0, behavior: 'smooth' });
        };

        window.eliminarPersonalMaestro = async function (id) {
            const domi = personalMaestro.find(x => x.id === id);
            const res = await confirmarAccion({
                titulo: "Borrar de Base de Datos",
                texto: `¿Eliminar a ${domi.nombre} permanentemente de la lista maestra?`,
                botonSi: "Eliminar",
                color: "var(--danger)",
                icono: '<i class="fas fa-user-minus" style="color:var(--danger)"></i>'
            });
            if (res) {
                set(ref(db, `personal_maestro/${id}`), null);
                renderListaMaestra();
            }
        };

        // Escuchar Enter en todos los inputs del maestro
        document.querySelectorAll('#modalPersonal input').forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    if (input.id === 'inputNombreMaestro' || input.id === 'inputSalarioMaestro') {
                        agregarPersonalMaestro();
                    }
                }
            });
        });

        window.borrarTodaLaBaseMaestra = async function () {
            
            const res = await confirmarAccion({
                titulo: "Borrado Crítico",
                texto: "¿Deseas vaciar toda la base de datos de domiciliarios? Esta acción no se puede deshacer.",
                botonSi: "Continuar",
                color: "#333",
                icono: '<i class="fas fa-exclamation-triangle" style="color:var(--danger)"></i>'
            });
            if (res) {
                const pass = prompt("Para confirmar el borrado de TODA la base maestra de personal, escribe la palabra: ELIMINAR");
                if (pass === "ELIMINAR") {
                    set(maestroRef, null); // Borrado total en la nube
                    renderListaMaestra();
                } else if (pass !== null) {
                    alert("Confirmación incorrecta.");
                }
            }
        };

        function renderListaMaestra() {
            const container = document.getElementById('listaPersonalMaestro');
            personalMaestro.sort((a, b) => a.nombre.localeCompare(b.nombre));
            let html = "";
            personalMaestro.forEach(p => {
                html += `
                    <div class="personal-row">
                        <div class="personal-info-main">
                            <span>${p.nombre}</span>
                            <div style="display:flex; gap:10px">
                                <button class="btn-del-maestro" style="color:var(--primary)" onclick="editarPersonalMaestro(${p.id})"><i class="fas fa-edit"></i></button>
                                <button class="btn-del-maestro" onclick="eliminarPersonalMaestro(${p.id})"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                        <div class="personal-details-grid">
                            <div class="detail-item"><i class="fas fa-id-card"></i> ${p.cedula || '---'}</div>
                            <div class="detail-item"><i class="fas fa-phone"></i> ${p.contacto || '---'}</div>
                            <div class="detail-item"><i class="fas fa-envelope"></i> ${p.correo || '---'}</div>
                            <div class="detail-item"><i class="fas fa-motorcycle"></i> ${p.placa || '---'}</div>
                            <div class="detail-item"><i class="fas fa-heartbeat"></i> EPS: ${p.eps || '---'}</div>
                            <div class="detail-item"><i class="fas fa-shield-alt"></i> ARL: ${p.arl || '---'}</div>
                            <div class="detail-item"><i class="fas fa-money-bill-wave"></i> Salario: ${p.salario || '---'}</div>
                            <div class="detail-item" style="grid-column: span 1;"><i class="fas fa-building"></i> Sede: ${p.sede || '---'}</div>
                            <div class="detail-item" style="grid-column: span 2;"><i class="fas fa-credit-card"></i> ${p.cuenta || '---'}</div>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html || '<p style="color:#8d99ae; font-size:0.8rem">No hay personal registrado.</p>';
        }

        window.cerrarModal = (id) => {
            if (id === 'modalPersonal') {
                editIdMaestro = null;
                const btnSave = document.querySelector('button[onclick="agregarPersonalMaestro()"]');
                if (btnSave) {
                    btnSave.innerHTML = '<i class="fas fa-plus"></i>';
                    btnSave.style.background = 'var(--primary)';
                }
                // Limpiar campos
                const ids = ['inputNombreMaestro', 'inputCedulaMaestro', 'inputContactoMaestro', 'inputCorreoMaestro', 'inputCuentaMaestro', 'inputPlacaMaestro', 'inputSalarioMaestro', 'inputEPSMaestro', 'inputARLMaestro', 'inputSedeMaestro'];
                ids.forEach(i => {
                    const el = document.getElementById(i);
                    if (el) el.value = "";
                });
            }
            document.getElementById(id).style.display = 'none';
        };

        window.exportarExcel = async function () {
            const coordinadoresNames = ["Cristian Muñoz", "Andres Muñoz", "Nilton Cardona"];
            const lideresNames = ["Jhon Vega", "Kevin Villada"];

            const specificSortOrder = [...coordinadoresNames, ...lideresNames].map(n => norm(n));

            const listaParaExportar = [];
            personalMaestro.forEach(m => {
                const nm = norm(m.nombre);
                // Buscamos todas las coincidencias en el día y tomamos la más reciente (ID más alto)
                const coincidencias = domiciliarios.filter(d => norm(d.nombre) === nm);
                const activo = coincidencias.length > 0 ? coincidencias.sort((a, b) => b.id - a.id)[0] : null;

                if (activo) {
                    listaParaExportar.push(activo);
                } else {
                    listaParaExportar.push({
                        ...m,
                        inicioLaboral: "--:--",
                        finLaboral: "--:--",
                        inicioTimestamp: null,
                        finTimestamp: null,
                        
                        
                    });
                }
            });

            const nombresMaestro = personalMaestro.map(m => norm(m.nombre));
            domiciliarios.forEach(d => {
                if (!nombresMaestro.includes(norm(d.nombre))) {
                    listaParaExportar.push(d);
                }
            });

            listaParaExportar.sort((a,b) => 0);

            if (listaParaExportar.length === 0) return;

            const workbook = new ExcelJS.Workbook();

            // Fetch the logo once to add it to each sheet
            let logoBuffer = null;
            try {
                const response = await fetch('LOGO DOMIFASTER.png');
                if (response.ok) {
                    logoBuffer = await response.arrayBuffer();
                }
            } catch (err) { console.warn("Logo no disponible"); }

            const crearHojaSede = (sheetName, itemsSede) => {
                if (itemsSede.length === 0) return;

                const worksheet = workbook.addWorksheet(sheetName);

                worksheet.columns = [
                    { key: 'fecha', width: 15 },
                    { key: 'nombre', width: 35 },
                    { key: 'cedula', width: 15 },
                    { key: 'contacto', width: 18 },
                    { key: 'correo', width: 30 },
                    { key: 'placa', width: 12 },
                    { key: 'cuenta', width: 35 },
                    { key: 'ingreso', width: 12 },
                    { key: 'salida', width: 12 },
                    { key: 'horas', width: 12 },
                    { key: 'extras', width: 12 },
                    { key: width: 12 },
                    { key: 'sede', width: 15 },
                    { key: 'valor', width: 18 }
                ];

                // --- LOGO ---
                worksheet.addRow([]); worksheet.addRow([]); worksheet.addRow([]); worksheet.addRow([]); worksheet.addRow([]);
                if (logoBuffer) {
                    try {
                        const logoId = workbook.addImage({ buffer: logoBuffer, extension: 'png' });
                        worksheet.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: 140, height: 95 } });
                    } catch (err) { console.warn("Error agregando logo a " + sheetName); }
                }

                const headerRow = worksheet.getRow(6);
                headerRow.values = ['FECHA', 'NOMBRE', 'CÉDULA', 'CONTACTO', 'CORREO', 'PLACA', 'CUENTA', 'INGRESO', 'SALIDA', 'HORAS', 'EXTRAS', 'SEDE', 'VALOR'];
                headerRow.eachCell((cell) => {
                    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2596BE' } };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });
                headerRow.height = 25;

                let tE = 0, tV = 0;
                let cCoord = 0, cLid = 0, cDom = 0;

                itemsSede.forEach(d => {
                    const nameNorm = norm(d.nombre);
                    const isCoord = coordinadoresNames.some(n => norm(n) === nameNorm);
                    const isLid = lideresNames.some(n => norm(n) === nameNorm);
                    const isIndrive = nameNorm.includes("indrive");

                    let dIng = (d.inicioLaboral && d.inicioLaboral !== "--:--") ? d.inicioLaboral : (isCoord || isLid ? "08:00 AM" : "--:--");
                    let dSal = (d.finLaboral && d.finLaboral !== "--:--") ? d.finLaboral : (isCoord || isLid ? "04:30 PM" : "--:--");
                    let dHrs = "--:--";
                    let dExt = "0h 0m";
                    let dVal = 0;
                    

                    let extraHorasColor = false;
                    

                    let diffMins = obtenerMinutosEntre(dIng, dSal);
                    if (diffMins > 0) {
                        let hrs = Math.floor(diffMins / 60);
                        let mins = diffMins % 60;
                        dHrs = `${hrs}h ${mins}m`;
                    } else if (isCoord || isLid) {
                        dHrs = "8h 30m";
                        diffMins = 510;
                    }

                    let currentSal = d.salario;
                    if (!currentSal || currentSal.trim() === "") {
                        const m = personalMaestro.find(p => norm(p.nombre) === nameNorm);
                        if (m) currentSal = m.salario;
                    }
                    let dValBase = 143000;

                    if (isCoord || isLid) {
                        if (isCoord) cCoord++; else cLid++;
                        dVal = dValBase;
                    } else {
                        if (d.inicioLaboral !== "--:--") {
                            cDom++;
                            if (!isIndrive) dVal = dValBase;
                        }
                    }

                    let tieneBono = false;
                    if (!isCoord && !isLid && dEnt > 18) {
                        dVal += ((dEnt - 18) * 10000);
                        
                        tieneBono = true;
                    }

                    if (!isIndrive && d.inicioLaboral !== "--:--" && !tieneBono) {
                        if (diffMins > 510) {
                            const extraMin = diffMins - 510;
                            const totalHalfHours = Math.floor(extraMin / 30);
                            const fullHours = Math.floor(totalHalfHours / 2);
                            const remainingHalfHours = totalHalfHours % 2;
                            dVal += (fullHours * 15000) + (remainingHalfHours * 7000);
                            extraHorasColor = true;

                            const extraPagadoMin = totalHalfHours * 30;
                            dExt = `${Math.floor(extraPagadoMin / 60)}h ${extraPagadoMin % 60}m`;
                        }
                    }

                    const row = worksheet.addRow({
                        fecha: new Date().toLocaleDateString(),
                        nombre: d.nombre,
                        cedula: d.cedula || '--',
                        contacto: d.contacto || '--',
                        correo: d.correo || '--',
                        placa: d.placa || '--',
                        cuenta: d.cuenta || '--',
                        ingreso: dIng,
                        salida: dSal,
                        horas: dHrs,
                        extras: dExt,
                        
                        sede: d.sede || (personalMaestro.find(p => norm(p.nombre) === nameNorm) || {}).sede || "--",
                        valor: dVal
                    });

                    row.height = 18;
                    row.eachCell((cell, colNumber) => {
                        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                        cell.border = { top: { style: 'thin', color: { argb: 'FFD0D0D0' } }, left: { style: 'thin', color: { argb: 'FFD0D0D0' } }, bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } }, right: { style: 'thin', color: { argb: 'FFD0D0D0' } } };

                        if ((colNumber === 10 || colNumber === 11 || colNumber === 14) && diffMins >= 540) {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF99' } };
                        }

                        if (false) {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFFCC' } };
                        }
                    });

                    row.getCell(14).numFmt = '"$"#,##0';
                    tE += dEnt; tV += dVal;
                });

                const totalRow = worksheet.addRow([]);
                totalRow.getCell(11).value = 'TOTALES';
                totalRow.getCell(12).value = tE;
                totalRow.getCell(14).value = tV;
                totalRow.getCell(14).numFmt = '"$"#,##0';
                totalRow.height = 20;
                totalRow.eachCell((cell) => {
                    cell.font = { bold: true };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF8FB' } };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = { top: { style: 'medium' }, left: { style: 'thin' }, bottom: { style: 'medium' }, right: { style: 'thin' } };
                });

                // --- CUADRO DE RESUMEN (A LA DERECHA - Columna 15) ---
                const summaryData = [
                    ['COORDINADORES', cCoord],
                    ['LIDERES', cLid],
                    ['DOMICILIARIOS', cDom],
                    [tE],
                    ['VALOR', tV]
                ];

                summaryData.forEach((data, index) => {
                    const row = worksheet.getRow(6 + index);
                    const cellLabel = row.getCell(15);
                    const cellValue = row.getCell(16);

                    cellLabel.value = data[0];
                    cellValue.value = data[1];

                    cellLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } };
                    cellLabel.font = { bold: true };

                    cellValue.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
                    cellValue.font = { bold: true };

                    [cellLabel, cellValue].forEach(cell => {
                        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    });

                    if (data[0] === 'VALOR') cellValue.numFmt = '"$"#,##0';
                });
                worksheet.getColumn(15).width = 20;
                worksheet.getColumn(16).width = 15;
            };

            // 1. Reporte Global (Todos)
            crearHojaSede('🌐 Global', listaParaExportar);

            // 2. Reporte Sede L.D. ISA
            const itemsldisa = listaParaExportar.filter(d => {
                const s = d.Sede || (personalMaestro.find(p => norm(p.nombre) === norm(d.Nombre)) || {}).sede || "";
                return s.toLowerCase().includes("l.d. isa");
            });
            crearHojaSede('ðŸ“Š L.D. ISA', itemsldisa);

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Reporte_Pez_Postre_${new Date().toLocaleDateString()}.xlsx`);
        };

        window.exportarMaestroExcel = async function () {
            if (personalMaestro.length === 0) { alert("No hay datos para exportar."); return; }
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('👥 Base de Datos');

            worksheet.columns = [
                { header: 'NOMBRE Y APELLIDO', key: 'nombre', width: 35 },
                { header: 'CÉDULA', key: 'cedula', width: 15 },
                { header: 'CONTACTO', key: 'contacto', width: 15 },
                { header: 'CORREO', key: 'correo', width: 25 },
                { header: 'PLACA MOTO', key: 'placa', width: 12 },
                { header: 'NÚMERO DE CUENTA', key: 'cuenta', width: 35 },
                { header: 'SALARIO', key: 'salario', width: 15 },
                { header: 'EPS', key: 'eps', width: 20 },
                { header: 'ARL', key: 'arl', width: 20 },
                { header: 'SEDE', key: 'sede', width: 15 }
            ];

            // --- LOGO ---
            worksheet.insertRow(1, []); worksheet.insertRow(2, []); worksheet.insertRow(3, []); worksheet.insertRow(4, []); worksheet.insertRow(5, []);

            try {
                const response = await fetch('LOGO DOMIFASTER.png');
                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    const logoId = workbook.addImage({ buffer: arrayBuffer, extension: 'png' });
                    worksheet.addImage(logoId, { tl: { col: 2, row: 0.2 }, ext: { width: 120, height: 85 } });
                }
            } catch (err) { }

            // Formato de Headers
            const headerRow = worksheet.getRow(6);
            headerRow.height = 22;
            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2596BE' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            let conteoI = 0, conteoC = 0, conteoB = 0;

            personalMaestro.sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach(p => {
                const row = worksheet.addRow({
                    nombre: p.nombre,
                    cedula: p.cedula || '--',
                    contacto: p.contacto || '--',
                    correo: p.correo || '--',
                    placa: p.placa || '--',
                    cuenta: p.cuenta || '--',
                    salario: p.salario || '--',
                    eps: p.eps || '--',
                    arl: p.arl || '--',
                    sede: p.sede || '--'
                });
                row.height = 18;
                row.eachCell((cell) => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = { top: { style: 'thin', color: { argb: 'FFD0D0D0' } }, left: { style: 'thin', color: { argb: 'FFD0D0D0' } }, bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } }, right: { style: 'thin', color: { argb: 'FFD0D0D0' } } };
                });

                const sl = (p.sede || "").toLowerCase();
                if (sl.includes("l.d. isa")) conteoI++;
                // ...
                // Data for charts
            }

            const ctx = document.getElementById("chart-sedes").getContext("2d");
            if (window.chartSedes) window.chartSedes.destroy();
            window.chartSedes = new Chart(ctx, {
                type: "pie",
                data: {
                    labels: ["L.D. ISA"],
                    datasets: [{
                        data: [conteoI],
                ['Total', personalMaestro.length]
            ];
            
            sumData.forEach((data, index) => {
                const row = worksheet.getRow(6 + index);
                const cellL = row.getCell(12);
                const cellV = row.getCell(13);
                cellL.value = data[0];
                cellV.value = data[1];

                if (index === 0) {
                    // Header del cuadro
                    cellL.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A5276' } };
                    cellV.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A5276' } };
                    cellL.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                    cellV.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                } else if (index === sumData.length - 1) {
                    // Total del cuadro
                    cellL.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF8FB' } };
                    cellV.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF8FB' } };
                    cellL.font = { bold: true };
                    cellV.font = { bold: true };
                } else {
                    // Filas de datos
                    cellL.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } };
                    cellV.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
                    cellL.font = { bold: true };
                }

                [cellL, cellV].forEach(cell => {
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                });
            });
            worksheet.getColumn(12).width = 15;
            worksheet.getColumn(13).width = 12;

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Base_De_Datos_Domiciliarios_${new Date().toLocaleDateString()}.xlsx`);
        };

        window.exportarDashboardExcel = async function () {
            if (historialData.length === 0) { alert("No hay datos históricos para exportar."); return; }

            const fechaD = document.getElementById('exportDesde').value;
            const fechaH = document.getElementById('exportHasta').value;
            const tD = fechaD ? new Date(fechaD + "T00:00:00").getTime() : 0;
            const tH = fechaH ? new Date(fechaH + "T23:59:59").getTime() : Infinity;
            const datosFiltrados = historialData.filter(h => h.timestamp >= tD && h.timestamp <= tH);
            if (datosFiltrados.length === 0) { alert("No hay datos en el rango seleccionado."); return; }

            const datosOrdenados = [...datosFiltrados].sort((a, b) => b.timestamp - a.timestamp);

            // --- Helper: identificar sede ---
            const esSede = (s, clave) => {
                if (!s) return false;
                const sl = s.toLowerCase();
                if (clave === 'l.d. isa') return sl.includes('l.d. isa');
                return false;
            };

            // --- Helper: estilos header ---
            const styleHeader = (cell, colorArgb) => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorArgb || 'FF2596BE' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            };
            const styleData = (cell) => {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = { top: { style: 'thin', color: { argb: 'FFD0D0D0' } }, left: { style: 'thin', color: { argb: 'FFD0D0D0' } }, bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } }, right: { style: 'thin', color: { argb: 'FFD0D0D0' } } };
            };
            const styleTotal = (cell) => {
                cell.font = { bold: true };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF8FB' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = { top: { style: 'medium' }, left: { style: 'thin' }, bottom: { style: 'medium' }, right: { style: 'thin' } };
            };

            const workbook = new ExcelJS.Workbook();

            // ============================================================
            // HOJA 1: RESUMEN GENERAL (con columnas por sede)
            // ============================================================
            const sheetResumenGeneral = workbook.addWorksheet('📊 Resumen General');
            sheetResumenGeneral.columns = [
                { key: 'fecha',         width: 15 },
                { key: 'cantDomi',      width: 15 },
                
                
                { key: '_sep',          width: 3  },
                { key: 'itagDomi',      width: 15 },
                
                { key: '_sep2',         width: 3  },
                { key: 'calDomi',       width: 16 },
                
                { key: '_sep3',         width: 3  },
                
            ]);
            sheetResumenGeneral.mergeCells('A1:D1');
            sheetResumenGeneral.mergeCells('F1:G1');
            sheetResumenGeneral.mergeCells('I1:J1');
            sheetResumenGeneral.mergeCells('L1:M1');
            tituloRow.eachCell((c, col) => {
                if ([1, 6, 9, 12].includes(col)) {
                    const colores = { 1: 'FF1A5276', 6: 'FF1A7A9E', 9: 'FF1E8449', 12: 'FF7D3C98' };
                    styleHeader(c, colores[col]);
                }
            });
            tituloRow.height = 22;

            const headerRow = sheetResumenGeneral.addRow([
                'FECHA', 'DOMICILIARIOS', '',
                'DOMICILIARIOS', '',
                'DOMICILIARIOS', '',
                'DOMICILIARIOS'
            ]);
            headerRow.eachCell((c, col) => {
                const colores = { 1:'FF2596BE',2:'FF2596BE',3:'FF2596BE',4:'FF2596BE', 6:'FF1A7A9E',7:'FF1A7A9E', 9:'FF1E8449',10:'FF1E8449', 12:'FF7D3C98',13:'FF7D3C98' };
                if (colores[col]) styleHeader(c, colores[col]);
            });
            headerRow.height = 20;

            let gtE = 0, gtT = 0, giE = 0, gcE = 0, gbE = 0;
            datosOrdenados.forEach(h => {
                const det = h.detalle || [];
                const mercaDet = det.filter(d => esSede(d.s, 'l.d. isa'));
                const mE = mercaDet.reduce((a, d) => a + (d.e || 0), 0);
                
                bodyData.push([
                    sedeName, totalDomis, '',
                    mercaDet.length, mE, '',
                    '', '', '',
                    '', ''
                ]);

                ]);
                row.eachCell(c => styleData(c));
                row.height = 18;
            });

            // Fila de totales
            const totalGenRow = sheetResumenGeneral.addRow([
                'TOTALES', '', gtE, gtT, '',
                '', giE, '',
                '', gcE, '',
                '', gbE
            ]);
            totalGenRow.eachCell(c => styleTotal(c));
            totalGenRow.height = 20;

            // ============================================================
            // HOJA 2: DETALLE GENERAL (todos con columna sede)
            // ============================================================
            const sheetDetalleGeneral = workbook.addWorksheet('📋 Detalle General');
            sheetDetalleGeneral.columns = [
                { key: 'fecha',    width: 15 },
                { key: 'nombre',   width: 35 },
                { key: 'sede',     width: 15 },
                { key: width: 13 },
                { key:   width: 13 },
            ];
            const hDG = sheetDetalleGeneral.addRow(['FECHA', 'DOMICILIARIO', 'SEDE', '] );
            hDG.eachCell(c => styleHeader(c, 'FF2596BE'));
            hDG.height = 22;

            datosOrdenados.forEach(h => {
                if (h.detalle && Array.isArray(h.detalle)) {
                    h.detalle.forEach(d => {
                        const row = sheetDetalleGeneral.addRow([h.fecha, d.n, d.s || '--', d.e, d.t || 0]);
                        row.eachCell(c => styleData(c));
                        row.height = 18;
                    });
                }
            });

            // ============================================================
            // Helper: Crear hoja de detalle y resumen por sede
            // ============================================================
            const crearHojasSede = (nombreSede, claveSede, colorArgb) => {
                // Resumen por fecha para esta sede
                const wsResumen = workbook.addWorksheet(`📊 Resumen ${nombreSede}`);
                wsResumen.columns = [
                    { key: 'fecha',    width: 15 },
                    { key: 'cantDomi', width: 16 },
                    { key: width: 16 },
                    { key:   width: 14 },
                ];
                const hR = wsResumen.addRow(['FECHA', 'DOMICILIARIOS', '] );
                hR.eachCell(c => styleHeader(c, colorArgb));
                hR.height = 22;

                let rTE = 0, rTT = 0;
                datosOrdenados.forEach(h => {
                    const det = (h.detalle || []).filter(d => esSede(d.s, claveSede));
                    if (det.length === 0) return;
                    const ent = det.reduce((a, d) => a + (d.e || 0), 0);
                    const tor = det.reduce((a, d) => a + (d.t || 0), 0);
                    rTE += ent; rTT += tor;
                    const row = wsResumen.addRow([h.fecha, det.length, ent, tor]);
                    row.eachCell(c => styleData(c));
                    row.height = 18;
                });
                const totR = wsResumen.addRow(['TOTALES', '', rTE, rTT]);
                totR.eachCell(c => styleTotal(c));
                totR.height = 20;

                // Detalle por domiciliario para esta sede
                const wsDetalle = workbook.addWorksheet(`📋 Detalle ${nombreSede}`);
                wsDetalle.columns = [
                    { key: 'fecha',    width: 15 },
                    { key: 'nombre',   width: 35 },
                    { key: width: 13 },
                    { key:   width: 13 },
                ];
                const hD = wsDetalle.addRow(['FECHA', 'DOMICILIARIO', '] );
                hD.eachCell(c => styleHeader(c, colorArgb));
                hD.height = 22;

                let dTE = 0, dTT = 0;
                datosOrdenados.forEach(h => {
                    (h.detalle || []).filter(d => esSede(d.s, claveSede)).forEach(d => {
                        const row = wsDetalle.addRow([h.fecha, d.n, d.e, d.t || 0]);
                        row.eachCell(c => styleData(c));
                        row.height = 18;
                        dTE += (d.e || 0); dTT += (d.t || 0);
                    });
                });
                const totD = wsDetalle.addRow(['TOTALES', '', dTE, dTT]);
                totD.eachCell(c => styleTotal(c));
                totD.height = 20;
            };

            // ============================================================
            // HOJAS POR SEDE
            // ============================================================
            crearHojasSede('L.D. ISA', 'l.d. isa', 'FF1A7A9E');

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Historico_Rendimiento_Pez_Postre_${new Date().toLocaleDateString()}.xlsx`);
        };

        window.agregar = async function () {
            let input = document.getElementById("nombreInput");
            const nombreTxt = input.value.trim();
            if (!nombreTxt) return;

            // Bloque de seguridad para el botón
            const btnAdd = document.getElementById('btn-agregar');
            if (btnAdd) btnAdd.disabled = true;

            // Buscar datos en el maestro
            const maestro = buscarEnMaestro(nombreTxt);

            // Generación de ID más robusta para evitar colisiones en ráfagas
            const nuevoId = Date.now() + Math.floor(Math.random() * 1000);
            const nuevoDomi = {
                id: nuevoId,
                nombre: nombreTxt,
                cedula: maestro && maestro.cedula ? maestro.cedula : "",
                contacto: maestro && maestro.contacto ? maestro.contacto : "",
                correo: maestro && maestro.correo ? maestro.correo : "",
                cuenta: maestro && maestro.cuenta ? maestro.cuenta : "",
                placa: maestro && maestro.placa ? maestro.placa : "",
                salario: maestro && maestro.salario ? maestro.salario : "",
                eps: maestro && maestro.eps ? maestro.eps : "",
                arl: maestro && maestro.arl ? maestro.arl : "",
                sede: (window.sedeSeleccionada !== 'Todas') ? window.sedeSeleccionada : (maestro && maestro.sede ? maestro.sede : ""),
                estado: "activo",
                inicioLaboral: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
                inicioTimestamp: getServerNow(),
                turnoTimestamp: getServerNow(), // Marcador para la cola de turnos
                finLaboral: "--:--",
                yaAlmorzo: false,
                _pendiente: true // Marca local para evitar desapariciones en sync
            };

            try {
                domiciliarios.push(nuevoDomi);
                render();

                input.value = "";
                if (document.activeElement === input) {
                    input.focus();
                }

                await guardar(nuevoDomi);

                // --- SINCRONIZACIÓN CON Centro de Gestión de Personal (index2.html) ---
                try {
                    const todayDateStr = new Date().toLocaleDateString('sv-SE');
                    const schedQuery = query(ref(db, 'programacion_domis'), orderByChild('name'), equalTo(nombreTxt));
                    const snapshot = await get(schedQuery);
                    
                    if (snapshot.exists()) {
                        const updates = {};
                        snapshot.forEach((child) => {
                            updates[`programacion_domis/${child.key}/asistencia/${todayDateStr}`] = true;
                        });
                        await update(ref(db), updates);
                        console.log("Asistencia sincronizada para:", nombreTxt);
                    }
                } catch (e) {
                    console.error("Error al sincronizar asistencia con index2.html:", e);
                }
                // --------------------------------------------------------------------
            } catch (error) {
                console.error("Error al agregar:", error);
                alert("⚠️ Error al guardar en la nube: " + error.message);
                // Si falló, lo quitamos de la lista local
                domiciliarios = domiciliarios.filter(x => x.id !== nuevoId);
                render();
            } finally {
                if (btnAdd) btnAdd.disabled = false;
            }
        };

        window.borrarTodo = async function (skipConfirm = false) {
            
            const res = skipConfirm || await confirmarAccion({
                titulo: "Cierre de Jornada",
                texto: "¿Borrar todos los datos actuales? Se archivará el reporte de hoy en el historial.",
                botonSi: "Cerrar y Archivar",
                color: "var(--danger)",
                icono: '<i class="fas fa-archive" style="color:var(--danger)"></i>'
            });
            if (res) {
                // Determinar la fecha del reporte (basada en los registros o hoy)
                const firstWithDate = domiciliarios.find(d => d.turnoTimestamp);
                const fechaArchivo = firstWithDate ? new Date(firstWithDate.turnoTimestamp).toLocaleDateString() : new Date().toLocaleDateString();
                const tsArchivo = firstWithDate ? firstWithDate.turnoTimestamp : getServerNow();

                // Archivar antes de borrar
                const reporteHoy = {
                    fecha: fechaArchivo,
                    timestamp: tsArchivo,
                     
                    detalle: domiciliarios.map(d => {
                        const liq = calcularLiquidacion(d);
                        return {
                            n: d.nombre,
                            s: d.sede || "",
                            
                            b: liq.base,
                            ex: liq.extras,
                            bo: liq.bono,
                            tot: liq.total,
                            h: liq.minsTrabajados,
                            hx: liq.minsExtra,
                            ing: d.inicioLaboral,
                            fin: d.finLaboral
                        };
                    })
                };

                

                set(domRef, null); // Borrado total en la nube
                domiciliarios = []; // Limpieza local inmediata para evitar "fantasmas" por el sistema de optimismo
                render();

                if (skipConfirm) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Jornada Archivada',
                        text: `Se han guardado los datos con fecha ${fechaArchivo} y se ha limpiado el panel.`,
                        timer: 3000
                    });
                }
            }
        };

        

        window.abrirModalRanking = function() {
            document.getElementById('modalRankingPodios').style.display = 'flex';
            window.calcularYMostrarRanking();
        };

        window.calcularYMostrarRanking = function() {
            const container = document.getElementById('containerRanking');
            if (!container) return;

            const stats = {}; 
            let minDate = Infinity;
            let maxDate = -Infinity;

            historialData.forEach(day => {
                if (day.timestamp < minDate) minDate = day.timestamp;
                if (day.timestamp > maxDate) maxDate = day.timestamp;

                // Agrupar por sede internamente para identificar ganadores por sede
                const porSede = {};
                day.detalle.forEach(d => {
                    if (!d.n || !d.s) return;
                    if (!porSede[d.s]) porSede[d.s] = [];
                    porSede[d.s].push({ n: d.n.trim(), e: (d.e || 0) });
                });

                // En cada sede, los mejores 3 ganan su "título"
                for (const sede in porSede) {
                    porSede[sede].sort((a, b) => b.e - a.e);
                    
                    porSede[sede].forEach((d, index) => {
                        // Normalizar nombre para la llave del objeto stats
                        const nombreKey = d.n.toUpperCase();
                        if (!stats[nombreKey]) stats[nombreKey] = { nombreReal: d.n, t1: 0, t2: 0, t3: 0, totalPuntos: 0 };
                        
                        if (index === 0 && d.e > 0) {
                            stats[nombreKey].t1++;
                            stats[nombreKey].totalPuntos += 10;
                        } else if (index === 1 && d.e > 0) {
                            stats[nombreKey].t2++;
                            stats[nombreKey].totalPuntos += 5;
                        } else if (index === 2 && d.e > 0) {
                            stats[nombreKey].t3++;
                            stats[nombreKey].totalPuntos += 2;
                        }
                    });
                }
            });

            // Convertir a array para el listado general
            const arr = Object.values(stats);
            
            // Ordenar por Top 1, luego Top 2, luego Top 3
            arr.sort((a,b) => 0);

            const fechaInicio = minDate !== Infinity ? new Date(minDate).toLocaleDateString() : 'N/A';
            const fechaFin = maxDate !== -Infinity ? new Date(maxDate).toLocaleDateString() : 'N/A';

            let html = `
                <div style="margin-bottom: 30px;">
                    <p style="font-size:0.85rem; color:var(--primary); font-weight:700; text-align:center; margin-bottom:5px;">
                        Periodo: ${fechaInicio} - ${fechaFin}
                    </p>
                    <p style="font-size:0.7rem; color:#8d99ae; margin-bottom:15px; text-align:center;">
                        * Los podios se calculan por sede diaria y se suman globalmente.
                    </p>
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: center;">
                        <thead>
                            <tr style="border-bottom: 2px solid #eee; color: #8d99ae;">
                                <th style="text-align: left; padding: 10px;">DOMICILIARIO</th>
                                <th>🥇 T1</th>
                                <th>🥈 T2</th>
                                <th>🥉 T3</th>
                                <th style="color: var(--primary);">SCORE</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${arr.filter(x => (x.t1 + x.t2 + x.t3) > 0).map((x, idx) => `
                                <tr style="border-bottom: 1px solid #f8f9fa; ${idx < 3 ? 'background: #fffdf0;' : ''}">
                                    <td style="text-align: left; padding: 12px; font-weight: 700;">
                                        ${idx === 0 ? '👑 ' : idx < 3 ? '⭐ ' : ''}${x.nombreReal}
                                    </td>
                                    <td><span style="background: #FFD700; color: white; padding: 2px 8px; border-radius: 10px; font-weight: 800;">${x.t1}</span></td>
                                    <td><span style="background: #C0C0C0; color: white; padding: 2px 8px; border-radius: 10px; font-weight: 800;">${x.t2}</span></td>
                                    <td><span style="background: #CD7F32; color: white; padding: 2px 8px; border-radius: 10px; font-weight: 800;">${x.t3}</span></td>
                                    <td style="font-weight: 800; color: var(--primary);">${x.totalPuntos} pts</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            if (arr.filter(x => (x.t1 + x.t2 + x.t3) > 0).length === 0) {
                html = "<p style='text-align:center; color:#8d99ae; padding: 20px;'>No hay datos para mostrar.</p>";
            }
            
            container.innerHTML = html;
        };

        window.exportarRankingExcel = async function() {
            if (!historialData || historialData.length === 0) {
                alert("No hay datos para exportar.");
                return;
            }

            const stats = {}; 
            let minDate = Infinity;
            let maxDate = -Infinity;

            // Mismo cálculo que el render
            historialData.forEach(day => {
                if (day.timestamp < minDate) minDate = day.timestamp;
                if (day.timestamp > maxDate) maxDate = day.timestamp;
                const porSede = {};
                day.detalle.forEach(d => {
                    if (!d.n || !d.s) return;
                    if (!porSede[d.s]) porSede[d.s] = [];
                    porSede[d.s].push({ n: d.n.trim(), e: (d.e || 0) });
                });
                for (const sede in porSede) {
                    porSede[sede].sort((a, b) => b.e - a.e);
                    porSede[sede].forEach((d, index) => {
                        const nombreKey = d.n.toUpperCase();
                        if (!stats[nombreKey]) stats[nombreKey] = { nombreReal: d.n, t1: 0, t2: 0, t3: 0, totalPuntos: 0 };
                        if (index === 0 && d.e > 0) { stats[nombreKey].t1++; stats[nombreKey].totalPuntos += 10; }
                        else if (index === 1 && d.e > 0) { stats[nombreKey].t2++; stats[nombreKey].totalPuntos += 5; }
                        else if (index === 2 && d.e > 0) { stats[nombreKey].t3++; stats[nombreKey].totalPuntos += 2; }
                    });
                }
            });

            const arr = Object.values(stats).filter(x => (x.t1 + x.t2 + x.t3) > 0);
            arr.sort((a,b) => 0);

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Ranking Podios');

            const fechaI = new Date(minDate).toLocaleDateString();
            const fechaF = new Date(maxDate).toLocaleDateString();

            worksheet.columns = [
                { header: 'DOMICILIARIO', key: 'n', width: 35 },
                { header: 'TOP 1 (10 pts)', key: 't1', width: 15 },
                { header: 'TOP 2 (5 pts)', key: 't2', width: 15 },
                { header: 'TOP 3 (2 pts)', key: 't3', width: 15 },
                { header: 'TOTAL SCORE', key: 'puntos', width: 15 }
            ];

            // Header Style
            worksheet.getRow(1).eachCell(cell => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD700' } }; // Gold
                cell.alignment = { horizontal: 'center' };
            });

            arr.forEach(x => {
                worksheet.addRow({
                    n: x.nombreReal,
                    t1: x.t1,
                    t2: x.t2,
                    t3: x.t3,
                    puntos: x.totalPuntos
                });
            });

            // Footer con info de periodo
            worksheet.addRow([]);
            worksheet.addRow({ n: `REPORTE GENERADO EL: ${new Date().toLocaleString()}` });
            worksheet.addRow({ n: `PERIODO ANALIZADO: ${fechaI} al ${fechaF}` });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `Ranking_Podios_${new Date().getTime()}.xlsx`;
            anchor.click();
            window.URL.revokeObjectURL(url);
        };



        window.cambiarEstado = async function (id) {
            let d = domiciliarios.find(x => x.id == id);
            if (!d) return;

            if (d.estado === "activo" || d.estado === "inactivo") {
                
                
                
                inEnt.value = ""; inTor.value = ""; modal.style.display = 'flex'; inEnt.focus();
                
                const data = await new Promise((resolve) => {
                    
                    
                    
                    const onConfirm = () => {
                        const res = { e: parseInt(inEnt.value) || 0, t: parseInt(inTor.value) || 0 };
                        cleanup();
                        resolve(res);
                    };
                    const onCancel = () => {
                        cleanup();
                        resolve(null);
                    };
                    const cleanup = () => {
                        confirmBtn.removeEventListener('click', onConfirm);
                        closeBtn.removeEventListener('click', onCancel);
                    };

                    confirmBtn.addEventListener('click', onConfirm);
                    closeBtn.addEventListener('click', onCancel);
                    modal.onclick = (e) => { if (e.target === modal) onCancel(); }
                });
                
                
                if (!data) return;

                await guardarConTransaccion(id, (current) => {
                    current.estado = "activo";
                    current.turnoTimestamp = getServerNow();
                    return current;
                });
            } else {
                await guardarConTransaccion(id, (current) => {
                    current.estado = "activo";
                    
                    current.turnoTimestamp = getServerNow();
                    return current;
                });
            }
        };

        window.descontarTodo = async function (id) {
            let d = domiciliarios.find(x => x.id == id);
            if (!d) return;
            const modal = document.getElementById('modalAjuste');
            
            
            inEnt.value = ""; inTor.value = ""; modal.style.display = 'flex';

            const data = await new Promise((resolve) => {
                const confirmBtn = document.getElementById('btnConfirmarAjuste');
                const closeBtn = document.getElementById('btnCerrarAjuste');
                
                const onConfirm = () => {
                    const res = { e: parseInt(inEnt.value) || 0, t: parseInt(inTor.value) || 0 };
                    cleanup();
                    resolve(res);
                };
                const onCancel = () => {
                    cleanup();
                    resolve(null);
                };
                const cleanup = () => {
                    confirmBtn.removeEventListener('click', onConfirm);
                    closeBtn.removeEventListener('click', onCancel);
                };

                confirmBtn.addEventListener('click', onConfirm);
                closeBtn.addEventListener('click', onCancel);
                modal.onclick = (e) => { if (e.target === modal) onCancel(); }
            });

            cerrarModal('modalAjuste');
            if (data) {
                await guardarConTransaccion(id, (current) => {
                    
                    
                    return current;
                });
            }
        };

        window.sumarTodo = async function (id) {
            let d = domiciliarios.find(x => x.id == id);
            if (!d) return;
            const modal = document.getElementById('modalSumar');
            
            
            inEnt.value = ""; inTor.value = ""; modal.style.display = 'flex';

            const data = await new Promise((resolve) => {
                const confirmBtn = document.getElementById('btnConfirmarSumar');
                const closeBtn = document.getElementById('btnCerrarSumar');
                
                const onConfirm = () => {
                    const res = { e: parseInt(inEnt.value) || 0, t: parseInt(inTor.value) || 0 };
                    cleanup();
                    resolve(res);
                };
                const onCancel = () => {
                    cleanup();
                    resolve(null);
                };
                const cleanup = () => {
                    confirmBtn.removeEventListener('click', onConfirm);
                    closeBtn.removeEventListener('click', onCancel);
                };

                confirmBtn.addEventListener('click', onConfirm);
                closeBtn.addEventListener('click', onCancel);
                modal.onclick = (e) => { if (e.target === modal) onCancel(); }
            });

            cerrarModal('modalSumar');
            if (data) {
                await guardarConTransaccion(id, (current) => {
                    
                    
                    return current;
                });
            }
        };

        window.gestionarAlmuerzo = function (id) {
            
            guardarConTransaccion(id, (current) => {
                if (current.estado !== "almorzando") {
                    current.estado = "almorzando";
                    current.finAlmuerzo = getServerNow() + TIEMPO_ALMUERZO;
                    
                    current.turnoTimestamp = getServerNow();
                } else {
                    current.estado = "activo";
                    current.finAlmuerzo = null;
                    current.yaAlmorzo = true;
                    current.turnoTimestamp = getServerNow();
                }
                return current;
            });
        };

        window.enviarWhatsApp = function (id) {
            
            const d = domiciliarios.find(x => x.id == id);
            if (!d) return;

            // Intento obtener el contacto del registro activo, sino del maestro
            let contact = d.contacto;
            if (!contact) {
                const maestro = buscarEnMaestro(d.nombre);
                if (maestro) contact = maestro.contacto;
            }

            if (!contact) { alert("No hay número de contacto registrado para este domiciliario."); return; }

            // Obtener Sede
            const maestroItem = buscarEnMaestro(d.nombre);
            const sedeLabel = d.sede || (maestroItem ? maestroItem.sede : "");
            const sedeMsg = sedeLabel ? `*Sede:* ${sedeLabel}\n` : "";

            // Calcular Ranking por Sede para incluir insignia en el mensaje
            const currentSedeRaw = sedeLabel || "";
            const rankedSede = [...domiciliarios]
                .filter(dom => {
                    const s = dom.sede || (buscarEnMaestro(dom.nombre) || {}).sede || "";
                    return s === currentSedeRaw;
                })
                
                .sort((a,b) => 0);

            const rankIdx = rankedSede.findIndex(x => x.id === d.id);
            let insigniaMsg = "";
            let felicitacion = "\n\n¡Excelente trabajo!";
            const sedeSuffix = currentSedeRaw ? ` (Sede ${currentSedeRaw})` : "";

            if (rankIdx === 0) {
                insigniaMsg = ``;
                felicitacion = `\n\n🏆 *¡ERES EL NÚMERO 1!* \nTu esfuerzo hoy fue insuperable. ¡Gracias por liderar con el ejemplo en la Sede ${currentSedeRaw}! 🚀`;
            } else if (rankIdx === 1) {
                insigniaMsg = ``;
                felicitacion = `\n\n🥈 *¡EXCELENTE DESEMPEÑO!* \nHas logrado el segundo lugar en la Sede ${currentSedeRaw}. ¡Estás imparable, mañana vamos por el primer puesto! 💪`;
            } else if (rankIdx === 2) {
                insigniaMsg = ``;
                felicitacion = `\n\n🥉 *¡DENTRO DEL TOP 3!* \nMuy buen trabajo el día de hoy en la Sede ${currentSedeRaw}. Tu constancia es clave para nuestro éxito. ✨`;
            }

            const liq = calcularLiquidacion(d);
            const formatM = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

            let desgloseMsg = liq.total > 0 ? `*Sueldo del día:* ${formatM(liq.total)}` : "";
            if (liq.total > 0 && (liq.extras > 0 || liq.bono > 0)) {
                desgloseMsg += `\n_( ${liq.base > 0 ? 'Base: ' + formatM(liq.base) : ''}${liq.extras > 0 ? (liq.base > 0 ? ' + ' : '') + 'Extras: ' + formatM(liq.extras) : ''}${liq.bono > 0 ? (liq.base > 0 || liq.extras > 0 ? ' + ' : '') + 'Bono: ' + formatM(liq.bono) : ''} )_`;
            }

            const msg = window.encodeURIComponent(
                `*Resumen - DomiFaster*\n\n` +
                `*Fecha:* ${new Date().toLocaleDateString()}\n` +
                `*Domiciliario:* ${d.nombre}\n` +
                sedeMsg +
                `*Ingreso:* ${d.inicioLaboral}\n` +
                `*Salida:* ${d.finLaboral || '--:--'}\n` +
                
                
                desgloseMsg + `\n` +
                insigniaMsg +
                felicitacion
            );

            abrirEnlaceWhatsApp(contact, msg);
        };

        window.finalizarTurno = async function (id) {
            let d = domiciliarios.find(x => x.id == id);
            if (!d) return;
            const res = await confirmarAccion({
                titulo: "Finalizar Turno",
                texto: `¿Cerrar turno para ${d.nombre}? Ya no aparecerá en las búsquedas de hoy.`,
                botonSi: "Finalizar",
                color: "#2d3436",
                icono: '<i class="fas fa-sign-out-alt" style="color:#2d3436"></i>'
            });
            if (res) {
                await guardarConTransaccion(id, (current) => {
                    current.finLaboral = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                    current.finTimestamp = getServerNow();
                    current.estado = "inactivo";
                    
                    current.turnoTimestamp = getServerNow();
                    return current;
                });
            }
        };

        window.eliminar = async function (id) {
            
            // Buscamos con == para permitir comparación de string vs number
            let d = domiciliarios.find(x => x.id == id);
            if (!d) return;

            const res = await confirmarAccion({
                titulo: "Quitar de Lista",
                texto: `¿Eliminar a ${d.nombre} definitivamente de la lista de hoy?`,
                botonSi: "Eliminar",
                color: "var(--danger)",
                icono: '<i class="fas fa-trash-alt" style="color:var(--danger)"></i>'
            });
            if (res) {
                // Optimismo local: Eliminamos la marca de pendiente para que no resucite en el sync
                const domiABorrar = domiciliarios.find(x => x.id == id);
                if (domiABorrar) domiABorrar._pendiente = false;

                domiciliarios = domiciliarios.filter(x => x.id != id);
                render();
                try {
                    await remove(ref(db, `domiciliarios/${id}`));
                } catch (error) {
                    console.error("Error al eliminar de Firebase:", error);
                }
            }
        };

        window.toggleInactivo = async function (id) {
            
            
            await guardarConTransaccion(id, (current) => {
                if (current.estado === "inactivo") {
                    current.estado = "activo";
                    current.inactivoStartTimestamp = null;
                    // La sincronización de asistencia se maneja fuera o se puede disparar después
                } else {
                    current.estado = "inactivo";
                    current.inactivoStartTimestamp = getServerNow();
                }
                
                current.turnoTimestamp = getServerNow();
                return current;
            });

            // Sincronización de asistencia post-transacción (opcional, mejor si es atómica pero requiere cambiar estructura)
            const d = domiciliarios.find(x => x.id == id);
            if (d && d.estado === "activo") {
                try {
                    const todayDateStr = new Date().toLocaleDateString('sv-SE');
                    const schedQuery = query(ref(db, 'programacion_domis'), orderByChild('name'), equalTo(d.nombre));
                    const snapshot = await get(schedQuery);
                    if (snapshot.exists()) {
                        const updates = {};
                        snapshot.forEach((child) => {
                            updates[`programacion_domis/${child.key}/asistencia/${todayDateStr}`] = true;
                        });
                        await update(ref(db), updates);
                    }
                } catch (e) {
                    console.error("Error al sincronizar asistencia:", e);
                }
            }
        };

        window.cambiarSede = async function (id) {
            

            // Actualizar registro activo con transacción
            await guardarConTransaccion(id, (current) => {
                const sedeActual = current.sede || "";
                let nuevaSede = "L.D. ISA";
                current.sede = nuevaSede;
                return current;
            });

            // Actualizar en base maestra para que el cambio sea permanente
            const d = domiciliarios.find(x => x.id == id);
            if (d) {
                const maestro = buscarEnMaestro(d.nombre);
                if (maestro) {
                    maestro.sede = d.sede;
                    await guardarMaestro(maestro);
                }
            }
        };



        window.renderContent = function () {
            const lista = document.getElementById("lista");
            if (!lista) return;
            const busq = document.getElementById("busqueda").value.toLowerCase();
            let html = "";
            let ahora = getServerNow();
            let c = { activo: 0, almorzando: 0, inactivo: 0 };
            let sM = 0;

            // Primero calculamos totales reales de sedes sin filtrar la lista
            
            domiciliarios.forEach((d) => {
                if (d.estado !== "finalizado") {
                    const s =
                        d.sede ||
                        (personalMaestro.find((p) => norm(p.nombre) === norm(d.nombre)) ||
                            {}
                        ).sede ||
                        "";
                    const sLow = s.toString().toLowerCase();
                    const esM = sLow.includes("l.d. isa");
                    if (esM) sM++;

                    if (esM) {
                        
                    }
                }
            });

            // --- FILTRADO DE SEDE ---
            const filtrados = domiciliarios.filter(d => {
                const sedeDomi = d.sede || (personalMaestro.find(p => norm(p.nombre) === norm(d.nombre)) || {}).sede || "";
                const sedeDomiLow = sedeDomi.toString().toLowerCase();
                return (window.sedeSeleccionada === "Todas") || (window.sedeSeleccionada === "L.D. ISA" && sedeDomiLow.includes("l.d. isa"));
            });

            // --- CÁLCULO DE RANKING POR SEDE ---
            const sedesDisponibles = ["L.D. ISA"];
            const top3BySede = {};

            sedesDisponibles.forEach(sName => {
                const sLow = sName.toLowerCase();
                const listSede = domiciliarios.filter(dom => {
                    const s = dom.sede || (personalMaestro.find(p => norm(p.nombre) === norm(dom.nombre)) || {}).sede || "";
                    const sl = s.toString().toLowerCase();
                    return sl.includes(sLow);
                });

                top3BySede[sName] = [...listSede]
                    
                    .sort((a,b) => 0)
                    .slice(0, 3)
                    .map(dom => dom.id);
            });

            // Ordenación
            const ordenados = [...filtrados].sort((a,b) => 0);

            ordenados.forEach((d) => {
                const nombreDomi = (d.nombre || "").toLowerCase();
                const cumpleBusqueda = nombreDomi.includes(busq);
                const cumpleEstado = (filtroEstado === "todos" || d.estado === filtroEstado);

                // Los contadores siempre deben reflejar el total de la sede para el filtro de estado seleccionado
                if (d.estado && c[d.estado] !== undefined) c[d.estado]++;
                
                

                // Solo renderizamos si cumple ambos filtros (Búsqueda y Estado)
                if (cumpleBusqueda && cumpleEstado) {
                    const idStr = String(d.id);
                    const maestroItem = buscarEnMaestro(d.nombre);
                    const sedeLabel = d.sede || (maestroItem ? maestroItem.sede : "") || "";
                    const sedeLabelLow = sedeLabel.toString().toLowerCase();

                    let sedeClass = "";
                    if (sedeLabelLow.includes("l.d. isa")) sedeClass = "sede-ldisa";

                    const sedeTagHTML = sedeLabel ? `<div class="sede-badge ${sedeClass}" ${isSupervisor ? `onclick="cambiarSede('${idStr}')" style="cursor:pointer" title="Click para cambiar sede"` : ''}>📍 ${sedeLabel}</div>` : '';

                    let timer = "";
                    if (d.estado === "almorzando" && d.finAlmuerzo) {
                        let diff = Math.max(0, Math.floor((d.finAlmuerzo - ahora) / 1000));
                        timer = `<span class="timer-display" data-timer-id="${d.id}" style="color:var(--danger); font-weight:800; font-size:0.8rem;"><i class="fas fa-utensils"></i> ${Math.floor(diff / 60)}:${(diff % 60).toString().padStart(2, '0')}</span>`;
                    } " style="color:var(--warning); font-weight:800; font-size:0.8rem;"><i class="fas fa-stopwatch"></i> ${Math.floor(diff / 60)}:${(diff % 60).toString().padStart(2, '0')}</span>`;
                    } else if (d.estado === "inactivo" && d.inactivoStartTimestamp) {
                        let diff = Math.max(0, Math.floor((ahora - d.inactivoStartTimestamp) / 1000));
                        timer = `<span class="timer-display" data-timer-id="${d.id}" style="color:#757575; font-weight:800; font-size:0.8rem;"><i class="fas fa-pause-circle"></i> ${Math.floor(diff / 60)}:${(diff % 60).toString().padStart(2, '0')}</span>`;
                    }

                    // Badge de Ranking (Ahora por sede)
                    let rankBadge = "";
                    let currentSedeKey = "";
                    if (sedeLabelLow.includes("l.d. isa")) currentSedeKey = "L.D. ISA";

                    const top3Ids = currentSedeKey ? (top3BySede[currentSedeKey] || []) : [];
                    const rankIdx = top3Ids.indexOf(d.id);
                    if (rankIdx === 0) rankBadge = '<i class="fas fa-medal medal medal-oro" title="Top 1 Sede"></i>';
                    else if (rankIdx === 1) rankBadge = '<i class="fas fa-medal medal medal-plata" title="Top 2 Sede"></i>';
                    else if (rankIdx === 2) rankBadge = '<i class="fas fa-medal medal medal-bronce" title="Top 3 Sede"></i>';

                    // Lógica de visibilidad de botones según rol
                    const discountBtnHTML = "";

                    let actionsHTML = "";
                    const btnWA = `<button class="btn-act btn-wa" onclick="enviarWhatsApp('${idStr}')" title="WhatsApp"><i class="fab fa-whatsapp"></i></button>`;
                    const btnPower = `<button class="btn-act" onclick="toggleInactivo('${idStr}')" style="color:${d.estado === 'inactivo' ? 'var(--danger)' : '#ccc'}" title="Activar/Desactivar"><i class="fas fa-power-off"></i></button>`;
                    const btnRoute = "";
                    const btnLunch = `<button class="btn-act" onclick="gestionarAlmuerzo('${idStr}')" style="color:var(--primary)" title="Enviar/Volver Almuerzo"><i class="fas fa-utensils"></i></button>`;
                    const btnLogout = `<button class="btn-act" onclick="finalizarTurno('${idStr}')" style="color:var(--dark)}" title="Finalizar Turno Laboral"><i class="fas fa-sign-out-alt"></i></button>`;
                    const btnTrash = `<button class="btn-act btn-delete" onclick="eliminar('${idStr}')" title="Eliminar domiciliario"><i class="fas fa-trash"></i></button>`;

                    // Todos los botones de tarjetas disponibles para Supervisor y Admin
                    if (window.isAdmin || window.isSupervisor) {
                        actionsHTML = btnWA + btnPower + btnRoute + btnLunch + btnLogout + btnTrash;
                    }

                    html += `
                        <div class="item">
                            ${sedeTagHTML}
                            <div class="info-col">
                                <div class="dom-name">
                                    ${rankBadge}
                                    ${d.nombre} 
                                    <div class="tag ${d.estado}" style="margin-left:5px">${d.estado}</div>
                                    ${d.yaAlmorzo ? '<span class="tag-done"><i class="fas fa-check"></i> Almorzó</span>' : ''}
                                    ${timer}
                                </div>
                                <div class="stats-row">
                                    <div class="time-badge" 
                                         style="${window.isAdmin ? 'cursor:pointer; background:var(--primary); color:white;' : ''}" 
                                         ${window.isAdmin ? `onclick="window.editarHoras('${idStr}')" title="Editar horas (Solo Admin)"` : ''}>
                                         <i class="fas fa-clock"></i> ${d.inicioLaboral} - ${d.finLaboral || '--:--'}
                                    </div>
                                    
                                    
                                    ${discountBtnHTML}
                                </div>
                            </div>
                            <div class="actions">
                                ${actionsHTML}
                            </div>
                        </div>`;
                }
            });
            lista.innerHTML = html;

            document.getElementById("total").innerText = filtrados.length;
            document.getElementById("activos").innerText = c.activo;
            
            document.getElementById("cant-almorzando").innerText = c.almorzando;
            document.getElementById("cant-inactivo").innerText = c.inactivo;
            
            

            if (window.isCallCenter) {
                
            }

            
            if (document.getElementById("count-ldisa")) {
                document.getElementById("count-ldisa").innerText = sM;
            }

        };

        window.filtrar = (e) => {
            filtroEstado = e;
            document.querySelectorAll('.filter-card').forEach(c => c.classList.remove('active'));
            document.getElementById('stat-' + e).classList.add('active');
            render();
        };

        const TIEMPO_ALMUERZO = 35 * 60 * 1000;
        setInterval(() => {
            let n = getServerNow();
            domiciliarios.forEach(d => {
                // Validación atómica para evitar dobles llamadas o colisiones entre dispositivos
                if (d.estado === "almorzando" && d.finAlmuerzo && d.finAlmuerzo <= n) {
                    guardarConTransaccion(d.id, (current) => {
                        if (current.estado === "almorzando" && current.finAlmuerzo && current.finAlmuerzo <= n) {
                            current.estado = "activo";
                            current.finAlmuerzo = null;
                            current.yaAlmorzo = true;
                            current.turnoTimestamp = n; 
                            return current;
                        }
                        return undefined; // Abortar si ya fue actualizado por otro cliente
                    });
                }
            });

            // Solo actualizamos los DOMs de los cronómetros específicos para no hacer render() de toda la lista
            document.querySelectorAll('[data-timer-id]').forEach(el => {
                const id = el.getAttribute('data-timer-id');
                const d = domiciliarios.find(x => x.id == id);
                if (!d) return;

                let timerHTML = "";
                if (d.estado === "almorzando" && d.finAlmuerzo) {
                    let diff = Math.max(0, Math.floor((d.finAlmuerzo - n) / 1000));
                    timerHTML = `<i class="fas fa-utensils"></i> ${Math.floor(diff / 60)}:${(diff % 60).toString().padStart(2, '0')}`;
                } :${(diff % 60).toString().padStart(2, '0')}`;
                } else if (d.estado === "inactivo" && d.inactivoStartTimestamp) {
                    let diff = Math.max(0, Math.floor((n - d.inactivoStartTimestamp) / 1000));
                    timerHTML = `<i class="fas fa-pause-circle"></i> ${Math.floor(diff / 60)}:${(diff % 60).toString().padStart(2, '0')}`;
                }
                if (el.innerHTML !== timerHTML) el.innerHTML = timerHTML;
            });
        }, 1000);

        // --- LÓGICA DE REPORTES SEMANALES (DOMINGO A SÁBADO) ---
        function obtenerRangoSemanal() {
            const hoy = new Date();
            const diaSemana = hoy.getDay(); // 0: Dom, 1: Lun, ..., 6: Sab

            // Según el usuario: la liquidación es de domingo a sábado.
            // Los lunes se reinicia la semana y pasa a la siguiente.
            // Si hoy es domingo (0), mostramos la semana que terminó ayer sábado.
            // Si hoy es de lunes (1) a sábado (6), mostramos la semana actual (que empezó el domingo pasado).
            const diasAtrasAlDomingo = (diaSemana === 0) ? 7 : diaSemana;

            const inicio = new Date(hoy);
            inicio.setDate(hoy.getDate() - diasAtrasAlDomingo);
            inicio.setHours(0, 0, 0, 0);

            const fin = new Date(inicio);
            fin.setDate(inicio.getDate() + 6);
            fin.setHours(23, 59, 59, 999);

            return { inicio, fin };
        }

        window.abrirModalSemanales = function () {
            document.getElementById('modalSemanales').style.display = 'flex';
            const inputBusqueda = document.getElementById('busquedaSemanales');
            if (inputBusqueda) inputBusqueda.value = '';
            renderReportesSemanales();
        };

        window.filtrarSemanales = function (val) {
            renderReportesSemanales(val);
        };

        function renderReportesSemanales(filtro = "") {
            const container = document.getElementById('listaSemanales');
            if (historialData.length === 0) {
                container.innerHTML = '<p>No hay datos históricos para generar reportes.</p>';
                return;
            }

            const rango = obtenerRangoSemanal();
            const fI = rango.inicio.getTime();
            const fF = rango.fin.getTime();

            // Mostrar el rango en el modal
            const rangeText = `Semana del ${rango.inicio.toLocaleDateString()} al ${rango.fin.toLocaleDateString()}`;
            const subTitle = document.querySelector('#modalSemanales p');
            if (subTitle) subTitle.innerText = rangeText;

            const nombresSet = new Set();
            historialData.forEach(h => {
                // El timestamp del historial es del día del reporte.
                // Verificamos si cae dentro del rango de la semana domingo-sábado.
                if (h.timestamp >= fI && h.timestamp <= fF) {
                    h.detalle.forEach(d => nombresSet.add(d.n));
                }
            });

            const nombres = Array.from(nombresSet).sort();
            let html = "";
            const filtroMin = filtro.toLowerCase().trim();
            nombres.forEach(nombre => {
                if (filtroMin === "" || nombre.toLowerCase().includes(filtroMin)) {
                    html += `
                        <div class="personal-row" style="cursor:pointer" onclick="verDetalleSemanal('${nombre}')">
                            <div class="personal-info-main">
                                <span><i class="fas fa-user-circle"></i> ${nombre}</span>
                                <i class="fas fa-chevron-right" style="color:#6c5ce7"></i>
                            </div>
                        </div>
                    `;
                }
            });
            container.innerHTML = html || `<p style="text-align:center; padding:20px; color:#888;">No se encontraron registros${filtroMin ? ' para tu búsqueda' : ' para el periodo:<br><b>' + rangeText + '</b>'}</p>`;
        }

        window.repararHistorial = async function () {
            const res = await confirmarAccion({
                titulo: "Reparar Historial",
                texto: "Se recalcularán todos los pagos históricos usando los salarios individuales y la nueva lógica de tiempos. ¿Continuar?",
                botonSi: "Reparar Todo",
                color: "var(--warning)",
                icono: '<i class="fas fa-tools" style="color:var(--warning)"></i>'
            });
            if (!res) return;

            const updates = {};
            const coordinadoresNames = ["Cristian Muñoz", "Andres Muñoz", "Nilton Cardona"];
            const lideresNames = ["Jhon Vega", "Kevin Villada"];

            Object.keys(historialData_raw).forEach(key => {
                const h = historialData_raw[key];
                if (!h.detalle) return;

                h.detalle.forEach(d => {
                    const nameNorm = normalize(d.n);
                    const isCoord = coordinadoresNames.some(n => normalize(n) === nameNorm);
                    const isLid = lideresNames.some(n => normalize(n) === nameNorm);
                    const isIndrive = nameNorm.includes("indrive");

                    // Buscar salario en el maestro usando la lógica robusta (incluye alias)
                    const m = buscarEnMaestro(d.n);
                    let baseDaily = (m && m.salario && m.salario.trim() !== "") ? parseInt(m.salario.replace(/\D/g, "")) : 100000;

                    let valBase = 0;
                    if (isCoord || isLid) {
                        valBase = baseDaily;
                    } else if (!isIndrive && d.ing && d.ing !== "--:--") {
                        valBase = baseDaily;
                    }

                    // Calcular mins usando la nueva utilidad
                    let shiftStart = d.ing;
                    let shiftEnd = d.fin;
                    if (isCoord || isLid) {
                        if (!shiftStart || shiftStart === "--:--") shiftStart = "08:00 AM";
                        if (!shiftEnd || shiftEnd === "--:--") shiftEnd = "04:30 PM";
                    }

                    const totalMins = obtenerMinutosEntre(shiftStart, shiftEnd);

                    let valBono = 0;
                    if (!isCoord && !isLid && d.e > 18) {
                        valBono = (d.e - 18) * 10000;
                    }

                    let valExtra = 0;
                    let minsExtra = 0;
                    if (!isIndrive && totalMins > 510 && valBono === 0) {
                        const extraMin = totalMins - 510;
                        const totalHalfHours = Math.floor(extraMin / 30);
                        const fullHours = Math.floor(totalHalfHours / 2);
                        const remainingHalfHours = totalHalfHours % 2;
                        valExtra = (fullHours * 15000) + (remainingHalfHours * 7000);
                        minsExtra = totalHalfHours * 30;
                    }

                    d.b = valBase;
                    d.ex = valExtra;
                    d.bo = valBono;
                    d.tot = valBase + valExtra + valBono;
                    d.h = totalMins;
                    d.hx = minsExtra;
                });
                updates[key] = h;
            });

            await set(ref(db, 'historial'), updates);
            alert("✅ Historial reparado con éxito. Los valores ahora coinciden con los salarios y tiempos reales.");
            location.reload();
        };

        window.exportarLiquidacionesSemanalesExcel = async function () {
            if (historialData.length === 0) { alert("No hay datos históricos para exportar."); return; }

            const rango = obtenerRangoSemanal();
            const fI = rango.inicio.getTime();
            const fF = rango.fin.getTime();

            const nombresSet = new Set();
            historialData.forEach(h => {
                if (h.timestamp >= fI && h.timestamp <= fF) {
                    h.detalle.forEach(d => nombresSet.add(d.n));
                }
            });

            if (nombresSet.size === 0) { alert("No hay datos en la semana seleccionada para exportar."); return; }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Liquidaciones Semanales');

            worksheet.columns = [
                { header: 'DOMICILIARIO', key: 'nombre', width: 35 },
                { header: 'NÚMERO DE CUENTA', key: 'cuenta', width: 35 },
                { header: 'SUELDO BRUTO', key: 'bruto', width: 15 },
                { header: 'PRESTAMOS (incl. 5%)', key: 'prestamos', width: 20 },
                
                { header: 'PRESTACIONES', key: 'prestaciones', width: 15 },
                { header: 'OTROS DESCUENTOS', key: 'otros', width: 15 },
                { header: 'DESCUENTOS TOTALES', key: 'deducciones', width: 20 },
                { header: 'TOTAL NETO', key: 'neto', width: 15 },
                { header: 'PERIODO', key: 'periodo', width: 35 }
            ];

            const colColors = {
                3: 'FF2596BE', // Bruto (Azul)
                4: 'FFF72585', // Prestamos (Rosa/Rojo)
                
                6: 'FFF8961E', // Prestaciones (Naranja)
                7: 'FF8D99AE', // Otros (Gris)
                8: 'FF2B2D42', // Deducciones Totales (Oscuro)
                9: 'FF00B894'  // Neto (Verde)
            };

            // Formato Headers con colores específicos
            worksheet.getRow(1).eachCell((c, colNumber) => {
                c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                c.fill = { 
                    type: 'pattern', 
                    pattern: 'solid', 
                    fgColor: { argb: colColors[colNumber] || 'FF6C5CE7' } 
                };
                c.alignment = { horizontal: 'center' };
            });

            const periodoStr = `${rango.inicio.toLocaleDateString()} al ${rango.fin.toLocaleDateString()}`;

            let gBruto = 0, gPrestamos = 0, gPrestaciones = 0, gOtros = 0, gDeds = 0, gNeto = 0;

            [...nombresSet]
                .filter(nombre => !nombre.toLowerCase().includes('indrive'))
                .sort()
                .forEach(nombre => {
                    let bruto = 0;
                    historialData.forEach(h => {
                        if (h.timestamp >= fI && h.timestamp <= fF) {
                            const d = h.detalle.find(det => det.n === nombre);
                            if (d) bruto += (d.tot || 0);
                        }
                    });

                    const maestro = buscarEnMaestro(nombre);
                    const cuenta = maestro && maestro.cuenta ? maestro.cuenta : "--";

                    const weekKey = rango.inicio.toISOString().split('T')[0];
                    const dedKey = `${weekKey}_${norm(nombre)}`;
                    const listaDeds = deduccionesSemanales[dedKey];

                    let totalDed = 0;
                    let vPrestamos = 0;
                    
                    let vPrestaciones = 0;
                    let vOtros = 0;

                    if (Array.isArray(listaDeds)) {
                        listaDeds.forEach(d => {
                            const cNorm = normalize(d.c);
                            const val = d.v || 0;
                            if (cNorm === "prestamo") {
                                vPrestamos += val;
                                totalDed += val;
                            }  else if (cNorm === "prestaciones") {
                                vPrestaciones += val;
                                totalDed += val;
                            } else {
                                vOtros += val;
                                totalDed += val;
                            }
                        });
                    } else if (listaDeds && listaDeds.valor) {
                        totalDed = listaDeds.valor;
                    }

                    worksheet.addRow({
                        nombre: nombre,
                        cuenta: cuenta,
                        bruto: bruto,
                        prestamos: vPrestamos,
                        
                        prestaciones: vPrestaciones,
                        otros: vOtros,
                        deducciones: totalDed,
                        neto: bruto - totalDed,
                        periodo: periodoStr
                    });

                    // Acumular totales globales
                    gBruto += bruto;
                    gPrestamos += vPrestamos;
                    
                    gPrestaciones += vPrestaciones;
                    gOtros += vOtros;
                    gDeds += totalDed;
                    gNeto += (bruto - totalDed);
                });

            // Añadir Fila de Totales
            const totalRow = worksheet.addRow({
                nombre: 'TOTALES GENERALES',
                bruto: gBruto,
                prestamos: gPrestamos,
                
                prestaciones: gPrestaciones,
                otros: gOtros,
                deducciones: gDeds,
                neto: gNeto
            });

            // Estilo Fila de Totales
            totalRow.eachCell((cell, colNumber) => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                if (colNumber >= 3 && colNumber <= 9) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colColors[colNumber] } };
                } else {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D3436' } };
                }
                cell.alignment = { horizontal: 'center' };
            });

            // Formato de moneda, alineación, bordes y colores
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber > 1) {
                    // Formatear columnas de dinero (3 a 9)
                    for (let i = 3; i <= 9; i++) {
                        const cell = row.getCell(i);
                        cell.value = Number(cell.value) || 0;
                        cell.numFmt = '"$"#,##0';
                    }

                    // Pintar Total Neto (Columna 9) de verde claro
                    row.getCell(9).fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFCCFFCC' }
                    };
                }
                row.eachCell(cell => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Liquidaciones_Semanales_${periodoStr.replace(/\//g, '-')}.xlsx`);
        };

        window.verDetalleSemanal = function (nombre) {
            const rango = obtenerRangoSemanal();
            const fI = rango.inicio.getTime();
            const fF = rango.fin.getTime();

            // Lógica de persistencia de múltiples deducciones (Firebase sincronizado)
            const weekKey = rango.inicio.toISOString().split('T')[0];
            const dedKey = `${weekKey}_${norm(nombre)}`;
            const savedData = deduccionesSemanales[dedKey];

            let listaDeds = [];
            if (Array.isArray(savedData)) {
                // Filtrar para que no salgan los que tengan valor 0 (limpiar registros previos vacíos)
                listaDeds = savedData.filter(d => (d.v || 0) > 0);
            } else if (savedData && savedData.concepto && (savedData.valor || 0) > 0) {
                // Migración de formato antiguo solo si tiene valor
                listaDeds = [{ c: savedData.concepto, v: savedData.valor || 0 }];
            } else {
                // Iniciar vacío por solicitud del usuario
                listaDeds = [];
            }

            const reportesDomi = [];
            [...historialData].sort((a, b) => b.timestamp - a.timestamp).forEach(h => {
                if (h.timestamp >= fI && h.timestamp <= fF) {
                    const d = h.detalle.find(det => det.n === nombre);
                    if (d) {
                        reportesDomi.push({
                            fecha: h.fecha,
                            ...d
                        });
                    }
                }
            });

            if (reportesDomi.length === 0) {
                alert("No hay registros para este domiciliario en la semana seleccionada.");
                return;
            }

            let totalPay = 0, totalHours = 0, totalExtras = 0, totalEntregas = 0;
            let breakdownHTML = reportesDomi.map(r => {
                
                totalPay += (r.tot || 0);
                totalHours += (r.h || 0);
                totalExtras += (r.hx || 0);
                totalEntregas += (r.e || 0);

                const formatM = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);
                const h = Math.floor((r.h || 0) / 60);
                const m = (r.h || 0) % 60;
                const hx = Math.floor((r.hx || 0) / 60);
                const mx = (r.hx || 0) % 60;

                return `
                    <div style="padding:8px; border-bottom:1px solid #eee; font-size:0.85rem">
                        <div style="font-weight:700; color:var(--primary); display:flex; justify-content:space-between; align-items:center;">
                            ${r.fecha}
                            ${window.isAdmin ? `<button onclick="window.editarHorasHistorial('${nombre}', '${r.fecha}')" style="background:none; border:none; color:var(--primary); cursor:pointer; font-size:0.7rem;"><i class="fas fa-edit"></i> Editar Horas</button>` : ''}
                        </div>
                        <div style="display:flex; justify-content:space-between">
                            
                            <span style="font-weight:600">${formatM(r.tot)}</span>
                        </div>
                        <div style="font-size:0.75rem; color:#8d99ae">
                            Reloj: ${r.ing || '--'} a ${r.fin || '--'} (${h}h ${m}m) | Extras: ${hx}h ${mx}m
                        </div>
                    </div>
                `;
            }).reverse().join('');

            const hT = Math.floor(totalHours / 60);
            const mT = totalHours % 60;
            const hXT = Math.floor(totalExtras / 60);
            const mXT = totalExtras % 60;
            const formatM = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

            const content = `
                <h3 style="margin:0 0 5px 0">${nombre}</h3>
                <p style="color:var(--primary); font-weight:700; margin-bottom:5px">Informe Semanal</p>
                <p style="font-size:0.75rem; color:#8d99ae; margin-bottom:15px">${rango.inicio.toLocaleDateString()} al ${rango.fin.toLocaleDateString()}</p>
                
                <div style="background:#f8f9fa; padding:15px; border-radius:10px; margin-bottom:15px">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px">
                        
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px">
                        <span>Horas Laboradas:</span> <b>${hT}h ${mT}m</b>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px">
                        <span>Horas Extras:</span> <b>${hXT}h ${mXT}m</b>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:10px; padding-top:10px; border-top:2px solid #fff; font-size:1.1rem">
                        <span>Sueldo Bruto:</span> <b style="color:var(--success)">${formatM(totalPay)}</b>
                    </div>
                </div>

                <div style="margin-bottom: 15px; padding: 12px; border: 1.5px dashed #6c5ce7; border-radius: 12px; background: #fdfcff;">
                    <p style="font-weight: 700; font-size: 0.85rem; color: #6c5ce7; margin-bottom: 12px;"><i class="fas fa-minus-circle"></i> Deducciones / Préstamos</p>
                    
                    <!-- ÁREA DE ADICIÓN RÁPIDA -->
                    <div style="display: grid; grid-template-columns: 1.2fr 1fr auto; gap: 8px; margin-bottom: 15px; align-items: flex-end; background: white; padding: 10px; border-radius: 12px; border: 1px solid #eee; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
                        <div class="input-group" style="margin:0">
                            <label style="font-size: 0.65rem; color: #8d99ae;">Concepto</label>
                            <select id="selectConcepto" style="width: 100%; padding: 8px; border-radius: 10px; border: 2px solid #edf2f4; font-size: 0.85rem; outline: none;">
                                <option value="Prestamo">Prestamo</option>
                                
                                <option value="Prestaciones">Prestaciones</option>
                                <option value="Otro">Otro...</option>
                            </select>
                        </div>
                        <div class="input-group" style="margin:0">
                            <label style="font-size: 0.65rem; color: #8d99ae;">Valor</label>
                            <input type="number" id="valorConcepto" placeholder="$ 0" style="width: 100%; padding: 8px; border-radius: 10px; border: 2px solid #edf2f4; font-size: 0.85rem; outline: none; text-align: center; font-weight: 700;">
                        </div>
                        <button onclick="window.agregarDeduccionNueva()" style="background: var(--primary); color: white; border: none; width: 38px; height: 38px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s;">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>

                    <div id="containerDeducciones"></div>
                    
                    <div style="display:flex; justify-content:space-between; margin-top:15px; padding-top:10px; border-top:1.5px solid #eee; font-weight:800; color:var(--danger); font-size:1.1rem">
                        <span>Total Neto:</span> <span id="valTotalNeto">${formatM(totalPay)}</span>
                    </div>
                </div>

                <div style="max-height:200px; overflow-y:auto; margin-bottom:10px">
                    <p style="font-weight:600; font-size:0.8rem; margin-bottom:5px">Detalle día a día:</p>
                    ${breakdownHTML}
                </div>
            `;

            window.renderFilasDeduccion = function () {
                const container = document.getElementById('containerDeducciones');
                if (!container) return;
                container.innerHTML = listaDeds.map((d, index) => {
                    return `
                    <div style="display: grid; grid-template-columns: 1.2fr 1fr auto; gap: 8px; margin-bottom: 10px; align-items: center; background: #f8f9fa; padding: 8px; border-radius: 10px;">
                        <div style="font-size: 0.85rem; font-weight: 600; color: #4a5568;">
                            ${d.c}
                        </div>
                        <div style="text-align: right;">
                            <input type="number" class="ded-v" value="${d.v}" data-index="${index}" style="width: 100%; font-size: 0.85rem; padding: 4px; border: 1px solid #ddd; border-radius: 6px; text-align: center; font-weight: 700;" oninput="window.actualizarTotalNeto()">
                        </div>
                        <button onclick="window.eliminarFilaDeduccion(${index})" style="background:none; border:none; color:var(--danger); cursor:pointer; padding: 0 4px; font-size:1rem;" title="Eliminar"><i class="fas fa-times-circle"></i></button>
                    </div>
                `;
                }).join('');
            };

            window.agregarDeduccionNueva = function() {
                const select = document.getElementById('selectConcepto');
                const inputVal = document.getElementById('valorConcepto');
                const c = select.value;
                let v = parseInt(inputVal.value) || 0;

                if (v <= 0) {
                    Swal.fire({ icon: 'warning', title: 'Valor inválido', text: 'Por favor ingresa un monto mayor a 0.', timer: 2000, showConfirmButton: false });
                    return;
                }

                // Aplicar recargo del 5% de una vez si es Préstamo
                if (normalize(c) === "prestamo") {
                    v = Math.round(v * 1.05);
                }

                if (c === "Otro") {
                    Swal.fire({
                        title: '📝 Nuevo Concepto',
                        input: 'text',
                        inputLabel: 'Escribe el nombre de la deducción',
                        inputPlaceholder: 'Ej: Uniforme, Multa, Adelanto...',
                        showCancelButton: true,
                        confirmButtonText: 'Añadir',
                        cancelButtonText: 'Cancelar',
                        confirmButtonColor: 'var(--primary)',
                        customClass: { container: 'swal-on-top' },
                        inputValidator: (value) => {
                            if (!value || !value.trim()) return '⚠️ Escribe un nombre para la deducción';
                        }
                    }).then((result) => {
                        if (result.isConfirmed && result.value) {
                            listaDeds.push({ c: result.value.trim(), v: v });
                            inputVal.value = "";
                            window.renderFilasDeduccion();
                            window.actualizarTotalNeto();
                        }
                    });
                } else {
                    listaDeds.push({ c: c, v: v });
                    inputVal.value = "";
                    window.renderFilasDeduccion();
                    window.actualizarTotalNeto();
                }
            };

            window.eliminarFilaDeduccion = function (idx) {
                listaDeds.splice(idx, 1);
                window.renderFilasDeduccion();
                window.actualizarTotalNeto();
            };

            window.actualizarTotalNeto = function () {
                const rowVs = document.querySelectorAll('.ded-v');
                let totalDed = 0;
                let nuevasDeds = [];

                rowVs.forEach((input) => {
                    const idx = parseInt(input.getAttribute('data-index'));
                    const c = listaDeds[idx].c;
                    let v = parseInt(input.value) || 0;
                    
                    totalDed += v;
                    nuevasDeds.push({ c, v });
                });

                listaDeds = nuevasDeds;
                const neto = totalPay - totalDed;
                document.getElementById('valTotalNeto').innerText = formatM(neto);

                // Guardar persistente en Firebase
                set(ref(db, `deducciones_semanales/${dedKey}`), listaDeds);
            };

            document.getElementById('contenidoDetalleSemanal').innerHTML = content;
            window.renderFilasDeduccion();
            window.actualizarTotalNeto();
            document.getElementById('modalDetalleSemanal').style.display = 'flex';

            document.getElementById('btnWhatsAppSemanal').onclick = function () {
                const maestro = buscarEnMaestro(nombre);
                let contact = maestro ? maestro.contacto : "";
                let cuenta = maestro && maestro.cuenta ? maestro.cuenta : "No registrada";
                if (!contact) { alert("No hay contacto registrado en la base maestra."); return; }

                let msgDetails = reportesDomi.map(r => {
                    return `• *${r.fecha}:* Entregas: ${r.e || 0} | $${(r.tot || 0).toLocaleString('es-CO')}`;
                }).reverse().join('\n');

                const totalDed = listaDeds.reduce((acc, d) => acc + (d.v || 0), 0);
                const totalNeto = totalPay - totalDed;

                let dedMsg = "";
                if (totalDed > 0) {
                    dedMsg = listaDeds.filter(d => (d.v || 0) > 0).map(d => {
                        let val = d.v;
                        return `\n➖ ${d.c || 'Deducción'}: -${formatM(val)}`;
                    }).join('');
                    dedMsg += `\n💰 *TOTAL NETO: ${formatM(totalNeto)}*`;
                }

                const msg = window.encodeURIComponent(
                    `*Informe Semanal - DomiFaster*\n\n` +
                    `*Domi:* ${nombre}\n` +
                    `*Cuenta:* ${cuenta}\n` +
                    `*Periodo:* ${rango.inicio.toLocaleDateString()} - ${rango.fin.toLocaleDateString()}\n\n` +
                    `*Resumen:* \n` +
                    `📦 Entregas Totales: ${totalEntregas}\n` +
                    `⏱️ Horas Laboradas: ${hT}h ${mT}m\n` +
                    `⚡ Horas Extras: ${hXT}h ${mXT}m\n` +
                    `💵 Sueldo Bruto: ${formatM(totalPay)}` +
                    dedMsg +
                    (totalDed === 0 ? `\n💰 *TOTAL A PAGAR: ${formatM(totalPay)}*` : "") +
                    `\n\n*Desglose diario:*\n` +
                    msgDetails +
                    `\n\n_Favor verificar información y el número de cuenta. ¡Excelente semana!_`
                );

                abrirEnlaceWhatsApp(contact, msg);
            };
        };

        // --- SCROLL TO TOP ---
        const scrollBtn = document.getElementById("btnScrollTop");
        window.addEventListener("scroll", () => {
            if (window.scrollY > 300) {
                scrollBtn.classList.add("visible");
            } else {
                scrollBtn.classList.remove("visible");
            }
        });

        scrollBtn.onclick = () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        // --- Conversores de formato de hora ---
        // El sistema guarda "08:00 AM" pero <input type="time"> usa "HH:MM" (24h)
        function ampmToInput(str) {
            if (!str || str === '--:--' || str === 'Manual') return '';
            const m = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (!m) return '';
            let h = parseInt(m[1], 10);
            const min = m[2];
            const period = m[3].toUpperCase();
            if (period === 'AM' && h === 12) h = 0;
            else if (period === 'PM' && h !== 12) h += 12;
            return `${String(h).padStart(2, '0')}:${min}`;
        }
        function inputToAmpm(str) {
            if (!str) return '--:--';
            const [hStr, mStr] = str.split(':');
            let h = parseInt(hStr, 10);
            const min = mStr || '00';
            const period = h >= 12 ? 'PM' : 'AM';
            if (h === 0) h = 12;
            else if (h > 12) h -= 12;
            return `${String(h).padStart(2, '0')}:${min} ${period}`;
        }

        window.editarHoras = function(id) {
            if (!window.isAdmin) return;
            // Buscar en el array global 'domiciliarios'
            const d = domiciliarios.find(x => String(x.id) === String(id));
            if (!d) {
                console.error("No se encontró el domiciliario con ID:", id);
                return;
            }

            Swal.fire({
                title: `<i class="fas fa-clock" style="color:var(--primary)"></i> Editar Horas`,
                html: `
                    <p style="margin:0 0 12px; font-size:0.95rem; color:#555; font-weight:600;">${d.nombre}</p>
                    <div style="text-align:left; display:flex; flex-direction:column; gap:10px;">
                        <div>
                            <label style="font-size:0.85rem; font-weight:700; color:#333; display:block; margin-bottom:4px;">
                                🟢 Hora de Ingreso
                            </label>
                            <input type="time" id="swal-ing" class="swal2-input" style="margin:0; width:100%;"
                                   value="${ampmToInput(d.inicioLaboral)}">
                        </div>
                        <div>
                            <label style="font-size:0.85rem; font-weight:700; color:#333; display:block; margin-bottom:4px;">
                                🔴 Hora de Salida
                            </label>
                            <input type="time" id="swal-fin" class="swal2-input" style="margin:0; width:100%;"
                                   value="${ampmToInput(d.finLaboral)}">
                        </div>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: '<i class="fas fa-save"></i> Guardar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: 'var(--primary)',
                preConfirm: () => {
                    const ingVal = document.getElementById('swal-ing').value;
                    const finVal = document.getElementById('swal-fin').value;
                    if (!ingVal) {
                        Swal.showValidationMessage('⚠️ La hora de ingreso es requerida');
                        return false;
                    }
                    return {
                        ing: inputToAmpm(ingVal),
                        fin: finVal ? inputToAmpm(finVal) : '--:--'
                    };
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    const nuevaIng = result.value.ing;
                    const nuevaFin = result.value.fin;
                    // BUG FIX: ruta correcta es 'domiciliarios/${id}', no 'db_domis/${id}'
                    update(ref(db, `domiciliarios/${id}`), {
                        inicioLaboral: nuevaIng,
                        finLaboral: nuevaFin
                    }).then(() => {
                        // Actualizar array local inmediatamente para refrescar la UI
                        const idx = domiciliarios.findIndex(x => String(x.id) === String(id));
                        if (idx !== -1) {
                            domiciliarios[idx].inicioLaboral = nuevaIng;
                            domiciliarios[idx].finLaboral = nuevaFin;
                            render();
                        }
                        Swal.fire({
                            icon: 'success',
                            title: 'Horas actualizadas',
                            html: `<b>Ingreso:</b> ${nuevaIng}<br><b>Salida:</b> ${nuevaFin}`,
                            timer: 2000,
                            showConfirmButton: false
                        });
                    }).catch(err => {
                        Swal.fire({ icon: 'error', title: 'Error al guardar', text: err.message });
                    });
                }
            });
        };

        window.editarHorasHistorial = function(nombre, fecha) {
            if (!window.isAdmin) return;
            
            // Buscar el reporte en el historial local
            const h = historialData.find(item => item.fecha === fecha);
            if (!h) { Swal.fire({ icon: 'warning', title: 'No encontrado', text: 'No se encontró el registro de ese día.' }); return; }
            const det = h.detalle.find(d => d.n === nombre);
            if (!det) { Swal.fire({ icon: 'warning', title: 'No encontrado', text: 'No se encontró el domiciliario en ese día.' }); return; }

            Swal.fire({
                title: `<i class="fas fa-history" style="color:var(--primary)"></i> Editar Horas Historial`,
                html: `
                    <p style="margin:0 0 12px; font-size:0.9rem; color:#555; font-weight:600;">${nombre} — ${fecha}</p>
                    <div style="text-align:left; display:flex; flex-direction:column; gap:10px;">
                        <div>
                            <label style="font-size:0.85rem; font-weight:700; color:#333; display:block; margin-bottom:4px;">
                                🟢 Hora de Ingreso
                            </label>
                            <input type="time" id="swal-ing-h" class="swal2-input" style="margin:0; width:100%;"
                                   value="${ampmToInput(det.ing)}">
                        </div>
                        <div>
                            <label style="font-size:0.85rem; font-weight:700; color:#333; display:block; margin-bottom:4px;">
                                🔴 Hora de Salida
                            </label>
                            <input type="time" id="swal-fin-h" class="swal2-input" style="margin:0; width:100%;"
                                   value="${ampmToInput(det.fin)}">
                        </div>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: '<i class="fas fa-save"></i> Guardar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: 'var(--primary)',
                preConfirm: () => {
                    const ingVal = document.getElementById('swal-ing-h').value;
                    const finVal = document.getElementById('swal-fin-h').value;
                    if (!ingVal) {
                        Swal.showValidationMessage('⚠️ La hora de ingreso es requerida');
                        return false;
                    }
                    return {
                        ing: inputToAmpm(ingVal),
                        fin: finVal ? inputToAmpm(finVal) : '--:--'
                    };
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    // Actualizar en el detalle del historial
                    const nuevosDetalles = h.detalle.map(d => {
                        if (d.n === nombre) {
                            return { ...d, ing: result.value.ing, fin: result.value.fin };
                        }
                        return d;
                    });

                    update(ref(db, `historial/${h.id}`), { detalle: nuevosDetalles }).then(() => {
                        // Actualizar localmente para refrescar sin recargar
                        const hIdx = historialData.findIndex(item => item.id === h.id);
                        if (hIdx !== -1) historialData[hIdx].detalle = nuevosDetalles;
                        Swal.fire({
                            icon: 'success',
                            title: 'Historial Actualizado',
                            html: `<b>Ingreso:</b> ${result.value.ing}<br><b>Salida:</b> ${result.value.fin}`,
                            timer: 2000,
                            showConfirmButton: false
                        });
                        if (window.verDetalleSemanal) window.verDetalleSemanal(nombre);
                    }).catch(err => {
                        Swal.fire({ icon: 'error', title: 'Error al guardar', text: err.message });
                    });
                }
            });
        };

    










