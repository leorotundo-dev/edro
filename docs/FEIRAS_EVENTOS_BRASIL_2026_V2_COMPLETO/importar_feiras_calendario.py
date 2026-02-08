#!/usr/bin/env python3
"""
Script para importar feiras, convenções e expos ao calendário 2026
Integra com o schema do calendário existente
"""

import csv
import json
from datetime import datetime
from typing import List, Dict
import re

# Mapeamento de segmentos para event_type do schema
SEGMENTO_TO_EVENT_TYPE = {
    'AGROPECUÁRIO': 'SEASONAL',
    'TECNOLOGIA': 'INSTITUTIONAL',
    'SAÚDE': 'INSTITUTIONAL',
    'MODA': 'RETAIL',
    'ALIMENTOS': 'RETAIL',
    'CONSTRUÇÃO': 'INSTITUTIONAL',
    'AUTOMOTIVO': 'RETAIL',
    'BELEZA': 'RETAIL',
    'EDUCAÇÃO': 'INSTITUTIONAL',
    'TURISMO': 'SEASONAL',
    'CASA E DECORAÇÃO': 'RETAIL',
    'MÓVEIS': 'RETAIL',
    'ARTESANATO': 'CULTURAL',
    'CULTURA POP': 'CULTURAL',
    'ESPORTES': 'CULTURAL',
    'GASTRONOMIA': 'CULTURAL',
    'VAREJO': 'RETAIL',
    'LOGÍSTICA': 'INSTITUTIONAL',
    'ENERGIA': 'INSTITUTIONAL',
    'SUSTENTABILIDADE': 'INSTITUTIONAL',
}

def slugify(text: str) -> str:
    """Converte texto para slug URL-friendly"""
    text = text.lower()
    text = re.sub(r'[àáâãäå]', 'a', text)
    text = re.sub(r'[èéêë]', 'e', text)
    text = re.sub(r'[ìíîï]', 'i', text)
    text = re.sub(r'[òóôõö]', 'o', text)
    text = re.sub(r'[ùúûü]', 'u', text)
    text = re.sub(r'[ç]', 'c', text)
    text = re.sub(r'[^a-z0-9]+', '-', text)
    text = re.sub(r'-+', '-', text)
    return text.strip('-')

def determinar_event_type(segmento: str) -> str:
    """Determina o event_type baseado no segmento"""
    segmento_upper = segmento.upper()
    
    for key, value in SEGMENTO_TO_EVENT_TYPE.items():
        if key in segmento_upper:
            return value
    
    # Default para eventos institucionais
    return 'INSTITUTIONAL'

def determinar_segments(segmento: str, tags: str) -> List[str]:
    """Determina os segments baseado no segmento e tags"""
    segments = []
    
    # Adiciona segmento principal
    seg_lower = segmento.lower()
    if 'varejo' in seg_lower or 'retail' in seg_lower:
        segments.append('varejo')
    if 'supermercado' in seg_lower:
        segments.append('supermercado')
    if 'tecnologia' in seg_lower or 'tech' in seg_lower or 'ti' in seg_lower:
        segments.append('tecnologia')
    if 'saúde' in seg_lower or 'hospitalar' in seg_lower or 'médico' in seg_lower:
        segments.append('saude')
    if 'agro' in seg_lower or 'agrícola' in seg_lower:
        segments.append('agronegocio')
    if 'moda' in seg_lower or 'fashion' in seg_lower or 'vestuário' in seg_lower:
        segments.append('moda')
    if 'alimento' in seg_lower or 'bebida' in seg_lower or 'gastronomia' in seg_lower:
        segments.append('alimentos')
    if 'construção' in seg_lower or 'construcao' in seg_lower:
        segments.append('construcao')
    if 'automotivo' in seg_lower or 'veículo' in seg_lower:
        segments.append('automotivo')
    if 'beleza' in seg_lower or 'estética' in seg_lower or 'cosmético' in seg_lower:
        segments.append('beleza')
    if 'educação' in seg_lower or 'educacao' in seg_lower or 'ensino' in seg_lower:
        segments.append('educacao')
    if 'turismo' in seg_lower or 'viagem' in seg_lower or 'hotel' in seg_lower:
        segments.append('turismo')
    
    # Se não encontrou nenhum, adiciona genérico
    if not segments:
        segments.append('geral')
    
    return segments

def processar_csv_feiras(arquivo_entrada: str) -> List[Dict]:
    """Processa CSV de feiras e retorna lista de eventos formatados"""
    eventos = []
    
    with open(arquivo_entrada, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            # Parse data
            data_str = row['data']
            data_obj = datetime.strptime(data_str, '%Y-%m-%d')
            
            # Determina event_type
            event_type = determinar_event_type(row['segmento'])
            
            # Determina segments
            segments = determinar_segments(row['segmento'], row['tags'])
            
            # Parse tags
            tags_list = [t.strip() for t in row['tags'].split('|') if t.strip()]
            
            # Cria slug
            slug = slugify(f"{row['nome']}-{row['cidade']}-{data_obj.year}")
            
            # Monta evento
            evento = {
                'name': row['nome'],
                'slug': slug,
                'description': f"{row['tipo_evento']} em {row['cidade']}/{row['estado']}. Segmento: {row['segmento']}",
                'event_type': event_type,
                'date': data_str,
                'is_recurring': False,  # Feiras geralmente não recorrem automaticamente
                'recurrence': 'NONE',
                'country': 'BR' if row['estado'] != 'INTERNACIONAL' else 'INTL',
                'state': row['estado'] if row['estado'] != 'INTERNACIONAL' else None,
                'city': row['cidade'] if row['cidade'] != 'A DEFINIR' else None,
                'segments': segments,
                'tags': tags_list,
                'base_priority': int(row['base_priority']),
                'confidence_level': int(row['confidence_level']),
                'source': row['fonte'],
                'status': 'ACTIVE'
            }
            
            eventos.append(evento)
    
    return eventos

def gerar_sql_insert(eventos: List[Dict], arquivo_saida: str):
    """Gera arquivo SQL com INSERTs para importação"""
    
    with open(arquivo_saida, 'w', encoding='utf-8') as f:
        f.write("-- SQL para importar feiras e eventos ao calendário 2026\n")
        f.write("-- Gerado automaticamente\n\n")
        
        for evento in eventos:
            # Escapa aspas simples
            name = evento['name'].replace("'", "''")
            slug = evento['slug'].replace("'", "''")
            desc = evento['description'].replace("'", "''")
            
            # Formata arrays PostgreSQL
            segments_pg = "{" + ",".join(f'"{s}"' for s in evento['segments']) + "}"
            tags_pg = "{" + ",".join(f'"{t}"' for t in evento['tags']) + "}"
            
            # Monta INSERT
            sql = f"""INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    '{name}',
    '{slug}',
    '{desc}',
    '{evento['event_type']}',
    '{evento['date']}',
    {str(evento['is_recurring']).lower()},
    '{evento['recurrence']}',
    '{evento['country']}',
    {f"'{evento['state']}'" if evento['state'] else 'NULL'},
    {f"'{evento['city']}'" if evento['city'] else 'NULL'},
    '{segments_pg}',
    '{tags_pg}',
    {evento['base_priority']},
    {evento['confidence_level']},
    '{evento['source']}',
    '{evento['status']}'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

"""
            f.write(sql)
        
        f.write(f"\n-- Total de {len(eventos)} eventos importados\n")

def gerar_json_seed(eventos: List[Dict], arquivo_saida: str):
    """Gera arquivo JSON para seed (alternativa ao SQL)"""
    
    with open(arquivo_saida, 'w', encoding='utf-8') as f:
        json.dump(eventos, f, ensure_ascii=False, indent=2)
    
    print(f"✅ JSON gerado: {arquivo_saida}")

def integrar_com_csv_existente(arquivo_feiras: str, arquivo_calendario: str, arquivo_saida: str):
    """Integra feiras com o CSV do calendário existente"""
    
    # Lê calendário existente (sem cabeçalho no arquivo original)
    eventos_existentes = {}
    with open(arquivo_calendario, 'r', encoding='utf-8') as f:
        # Pula primeira linha se for cabeçalho
        primeira_linha = f.readline()
        if not primeira_linha.startswith('2026'):
            # Tem cabeçalho, continua
            pass
        else:
            # Não tem cabeçalho, volta ao início
            f.seek(0)
        
        reader = csv.reader(f)
        for row in reader:
            if len(row) >= 6:
                data = row[0]
                if data not in eventos_existentes:
                    eventos_existentes[data] = []
                eventos_existentes[data].append({
                    'data': row[0],
                    'dia': row[1],
                    'dia_semana': row[2],
                    'eventos': row[3],
                    'categorias': row[4],
                    'tags': row[5]
                })
    
    # Lê feiras
    feiras = {}
    with open(arquivo_feiras, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            data = row['data']
            if data not in feiras:
                feiras[data] = []
            
            # Formata como evento do calendário
            feira_evento = {
                'data': data,
                'dia': data.split('-')[2],
                'dia_semana': '',  # Será preenchido depois
                'eventos': row['nome'],
                'categorias': row['tipo_evento'].lower() + '|' + row['segmento'].lower(),
                'tags': row['tags']
            }
            feiras[data].append(feira_evento)
    
    # Combina e ordena
    todas_datas = sorted(set(list(eventos_existentes.keys()) + list(feiras.keys())))
    
    with open(arquivo_saida, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['data', 'dia', 'dia_semana', 'eventos', 'categorias', 'tags'])
        
        for data in todas_datas:
            # Eventos existentes
            if data in eventos_existentes:
                for evento in eventos_existentes[data]:
                    writer.writerow([
                        evento['data'],
                        evento['dia'],
                        evento['dia_semana'],
                        evento['eventos'],
                        evento['categorias'],
                        evento['tags']
                    ])
            
            # Feiras
            if data in feiras:
                for feira in feiras[data]:
                    writer.writerow([
                        feira['data'],
                        feira['dia'],
                        feira['dia_semana'],
                        feira['eventos'],
                        feira['categorias'],
                        feira['tags']
                    ])
    
    print(f"✅ CSV integrado gerado: {arquivo_saida}")

def main():
    """Função principal"""
    print("🚀 Importando feiras e eventos ao calendário 2026...\n")
    
    # Arquivos
    arquivo_feiras = 'feiras_eventos_brasil_2026_completo.csv'
    arquivo_calendario_original = 'calendario_365_dias_completo_2026.csv'
    
    # Processa feiras
    print("📊 Processando CSV de feiras...")
    eventos = processar_csv_feiras(arquivo_feiras)
    print(f"✅ {len(eventos)} eventos processados\n")
    
    # Gera SQL
    print("📝 Gerando SQL de importação...")
    gerar_sql_insert(eventos, 'importar_feiras_2026.sql')
    print("✅ SQL gerado: importar_feiras_2026.sql\n")
    
    # Gera JSON
    print("📝 Gerando JSON seed...")
    gerar_json_seed(eventos, 'feiras_2026_seed.json')
    print()
    
    # Integra com CSV existente
    print("🔗 Integrando com calendário existente...")
    integrar_com_csv_existente(
        arquivo_feiras,
        arquivo_calendario_original,
        'calendario_2026_completo_com_feiras.csv'
    )
    print()
    
    print("✅ IMPORTAÇÃO CONCLUÍDA!")
    print("\nArquivos gerados:")
    print("  1. importar_feiras_2026.sql - Para importar no PostgreSQL")
    print("  2. feiras_2026_seed.json - Para seed com Prisma/Drizzle")
    print("  3. calendario_2026_completo_com_feiras.csv - CSV integrado")
    print("\nPróximos passos:")
    print("  - Execute o SQL no banco: psql -f importar_feiras_2026.sql")
    print("  - Ou use o JSON no seed do Prisma")
    print("  - Ou importe o CSV integrado")

if __name__ == '__main__':
    main()
