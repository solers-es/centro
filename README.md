# Centro de trabajo de solers

Todo lo que tenemos, en una pantalla. Dos habitaciones, sin contraseña:

- **Escaparate** — el trabajo que se le puede enseñar a un cliente, cada uno con
  la captura de su propia aplicación de fondo.
- **Trastienda** — las 38 fichas: qué es cada cosa, dónde se abre, qué
  repositorio la guarda, cuándo se tocó y qué está roto.

También está aquí el informe de estado: [`informe.html`](informe.html).

## Esto no se edita a mano

Se genera en **`solers-es/solers`** y se copia aquí. Para actualizarlo, allí:

```bash
node centro-generar.mjs     # vuelve a medir repos, direcciones y estado
python centro-fotos.py      # rehace las capturas
python centro-prueba.py     # comprueba que no se ha roto nada
```

Y luego se copian `centro.html` → `index.html`, `centro-datos.json` y `fotos/`.
