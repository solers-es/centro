# Escaparate de solers

El trabajo que se puede enseñar: programas y webs funcionando hoy, con gente
usándolos. Se abre en **https://solers-es.github.io/centro/**.

Esto es **solo el escaparate**. Lo interno —qué está roto, qué repositorio
guarda cada cosa, el informe de estado— no vive aquí: este repositorio es
público.

## No se edita a mano

Se genera en `solers-es/solers`:

```bash
node centro-generar.mjs     # vuelve a medir repos, direcciones y estado
python centro-fotos.py      # rehace las capturas
python centro-prueba.py     # comprueba que no se ha roto nada
```

Y se sube desde ahí la carpeta `publico/`.
