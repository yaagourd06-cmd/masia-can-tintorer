// Utilitats mínimes per generar HTML de forma segura.

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Valor ja escapat que no s'ha de tornar a escapar. */
class Raw {
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}
export const raw = (value) => new Raw(value);

const render = (value) => {
  if (value == null || value === false) return '';
  if (Array.isArray(value)) return value.map(render).join('');
  if (value instanceof Raw) return value.value;
  return escape(value);
};

/** Plantilla etiquetada: escapa totes les interpolacions excepte raw() i altres html``. */
export const html = (strings, ...values) =>
  raw(strings.reduce((out, str, i) => out + str + (i < values.length ? render(values[i]) : ''), ''));

/** Atributs opcionals: attrs({ id: 'x', hidden: true, title: null }) */
export const attrs = (map) =>
  raw(
    Object.entries(map)
      .filter(([, v]) => v !== null && v !== undefined && v !== false)
      .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${escape(v)}"`))
      .join('')
  );

/** Substitueix {clau} pels valors donats. */
export const fill = (text, data) => String(text).replace(/\{(\w+)\}/g, (_, k) => data[k] ?? `{${k}}`);
