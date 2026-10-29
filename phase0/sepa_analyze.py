"""Fase 0: analiza un ZIP diario de SEPA y resume lo que hay en Tucumán.

Uso: python -I sepa_analyze.py <sepa_dia.zip> <carpeta_salida>

Recorre ZIP externo -> ZIP por comercio -> comercio.csv / sucursales.csv / productos.csv (separados por |).
Escribe en la carpeta de salida:
  - tucuman_sucursales.csv: todas las sucursales de la provincia (AR-T) con su comercio y bandera
  - tucuman_productos.csv: precios de las sucursales del Gran SMT
  - resumen.json: conteos por comercio/bandera
"""
import csv
import io
import json
import sys
import zipfile
from collections import Counter, defaultdict

GRAN_SMT = ["san miguel", "tucuman", "tucumán", "yerba buena", "tafi viejo", "tafí viejo", "banda del rio sali",
            "banda del río salí", "las talitas", "alderetes", "el manantial", "san pablo", "lules", "cebil redondo"]


def norm(s):
    return (s or "").strip().lower()


def read_csv(zf, name):
    member = next((n for n in zf.namelist() if n.lower().endswith(name)), None)
    if not member:
        return []
    raw = zf.read(member).decode("utf-8-sig", errors="replace")
    # Las últimas líneas suelen ser un pie "Última actualización: ..." que no es dato
    lines = [l for l in raw.splitlines() if l and not l.lower().startswith("&#250;ltima") and not l.lower().startswith("última")]
    return list(csv.DictReader(lines, delimiter="|"))


def iter_inner(zf):
    for name in zf.namelist():
        if name.lower().endswith(".zip"):
            # Algunos días vienen ZIP internos vacíos o rotos: se saltean y se informan
            try:
                inner = zipfile.ZipFile(io.BytesIO(zf.read(name)))
            except zipfile.BadZipFile:
                print(f"AVISO: ZIP interno inválido, se saltea: {name}", file=sys.stderr)
                continue
            with inner:
                yield name, inner


def main(path, outdir):
    resumen = {"comercios_en_tucuman": [], "zips": 0}
    suc_rows = []
    prod_rows = []
    with zipfile.ZipFile(path) as outer:
        for name, inner in iter_inner(outer):
            resumen["zips"] += 1
            sucs = read_csv(inner, "sucursales.csv")
            tuc = [s for s in sucs if s.get("sucursales_provincia") == "AR-T"]
            if not tuc:
                continue
            com = read_csv(inner, "comercio.csv")
            banderas = {(c.get("id_comercio"), c.get("id_bandera")): c.get("comercio_bandera_nombre") for c in com}
            razon = com[0].get("comercio_razon_social") if com else "?"
            in_smt = []
            for s in tuc:
                key = (s.get("id_comercio"), s.get("id_bandera"))
                loc = norm(s.get("sucursales_localidad"))
                smt = any(k in loc for k in GRAN_SMT)
                row = {
                    "zip": name, "razon_social": razon, "bandera": banderas.get(key, "?"),
                    "id_comercio": s.get("id_comercio"), "id_bandera": s.get("id_bandera"),
                    "id_sucursal": s.get("id_sucursal"), "nombre": s.get("sucursales_nombre"),
                    "tipo": s.get("sucursales_tipo"), "calle": s.get("sucursales_calle"),
                    "numero": s.get("sucursales_numero"), "localidad": s.get("sucursales_localidad"),
                    "lat": s.get("sucursales_latitud"), "lng": s.get("sucursales_longitud"), "gran_smt": smt,
                }
                suc_rows.append(row)
                if smt:
                    in_smt.append((s.get("id_comercio"), s.get("id_bandera"), s.get("id_sucursal")))
            resumen["comercios_en_tucuman"].append({
                "zip": name, "razon_social": razon,
                "banderas": sorted(set(banderas.get((s.get("id_comercio"), s.get("id_bandera")), "?") for s in tuc)),
                "sucursales_provincia": len(tuc), "sucursales_gran_smt": len(in_smt),
            })
            if not in_smt:
                continue
            wanted = set(in_smt)
            for p in read_csv(inner, "productos.csv"):
                k = (p.get("id_comercio"), p.get("id_bandera"), p.get("id_sucursal"))
                if k in wanted:
                    p["bandera"] = banderas.get(k[:2], "?")
                    prod_rows.append(p)

    with open(f"{outdir}/tucuman_sucursales.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(suc_rows[0].keys()))
        w.writeheader()
        w.writerows(suc_rows)
    if prod_rows:
        fields = list(prod_rows[0].keys())
        with open(f"{outdir}/tucuman_productos.csv", "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
            w.writeheader()
            w.writerows(prod_rows)

    # Conteos por bandera y sucursal
    por_suc = defaultdict(Counter)
    for p in prod_rows:
        k = f'{p["bandera"]} #{p["id_sucursal"]}'
        por_suc[k]["productos"] += 1
        por_suc[k]["con_ean"] += 1 if p.get("productos_ean") == "1" else 0
        por_suc[k]["con_promo1"] += 1 if (p.get("productos_precio_unitario_promo1") or "").strip() else 0
        por_suc[k]["con_promo2"] += 1 if (p.get("productos_precio_unitario_promo2") or "").strip() else 0
    resumen["productos_por_sucursal"] = {k: dict(v) for k, v in sorted(por_suc.items())}
    resumen["columnas_productos"] = list(prod_rows[0].keys()) if prod_rows else []
    with open(f"{outdir}/resumen.json", "w", encoding="utf-8") as f:
        json.dump(resumen, f, ensure_ascii=False, indent=2)
    print(json.dumps(resumen, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
