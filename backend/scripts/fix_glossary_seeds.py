import json
import glob
import os
import re

# Standard categories from docs/GLOSSARY.md
STANDARD_CATEGORIES = ['Cloud', 'Database', 'Security', 'System Design', 'Agile', 'Frontend', 'Backend']

# Mapping non-standard categories to standard ones
CATEGORY_MAPPING = {
    'Emerging Tech & Future BrSE': 'System Design',
    'Quality': 'System Design',
    'Infrastructure': 'Cloud',
    'Network': 'Cloud',
    'Finance': 'System Design',
    'AI': 'System Design',
    'DevOps': 'Cloud',
    'Testing': 'Agile',
    'Tool': 'System Design',
    'Management': 'Agile',
    'Soft Skills': 'Agile',
}

def clean_term_variation(text):
    if not text: return ""
    # Normalize spaces and slashes
    return " / ".join([p.strip() for p in text.split("/") if p.strip()])

def standardize_category(cat):
    if cat in STANDARD_CATEGORIES:
        return cat
    return CATEGORY_MAPPING.get(cat, 'System Design')

def run_fixer():
    seed_files = glob.glob('backend/app/seeds/glossary_batch_*.json')
    all_terms = []
    
    print(f"Loading {len(seed_files)} seed files...")
    for f in seed_files:
        with open(f, 'r', encoding='utf-8') as jf:
            all_terms.extend(json.load(jf))

    print(f"Total terms loaded: {len(all_terms)}")
    
    # 1. Deduplicate based on (japanese, english)
    # We use a dictionary where key is normalized (japanese, english)
    unique_content = {}
    
    for item in all_terms:
        # Normalize for comparison
        jp_norm = item.get('japanese', '').strip().lower()
        en_norm = item.get('english', '').strip().lower()
        key = (jp_norm, en_norm)
        
        if key not in unique_content:
            # First time seeing this term
            # Standardize before storing
            item['japanese'] = clean_term_variation(item.get('japanese'))
            item['english'] = clean_term_variation(item.get('english'))
            item['category'] = standardize_category(item.get('category'))
            unique_content[key] = item
        else:
            # Merge logic: if current item has longer note/example, take it
            existing = unique_content[key]
            if len(item.get('note', '')) > len(existing.get('note', '')):
                existing['note'] = item.get('note')
            if len(item.get('example', '')) > len(existing.get('example', '')):
                existing['example'] = item.get('example')
            # Merge roles
            existing['roles'] = list(set(existing.get('roles', []) + item.get('roles', [])))

    print(f"Terms after content deduplication: {len(unique_content)}")

    # 2. Handle ID collisions
    # Ensure every ID is unique and matches the term name for better traceability
    final_terms = []
    used_ids = set()
    
    for item in unique_content.values():
        original_id = item.get('id')
        # If ID is missing or generic, generate one from english name
        if not original_id or original_id.startswith('batch-'):
            base_id = re.sub(r'[^a-z0-9]+', '-', item['english'].split('/')[0].lower().strip())
            new_id = base_id
        else:
            new_id = original_id
            
        # Collision handling for ID
        counter = 1
        candidate_id = new_id
        while candidate_id in used_ids:
            candidate_id = f"{new_id}-{counter}"
            counter += 1
        
        item['id'] = candidate_id
        used_ids.add(candidate_id)
        final_terms.append(item)

    # 3. Save back into batches (keep batch size around 50 for readability)
    # Sort for consistency
    final_terms.sort(key=lambda x: (x['category'], x['id']))
    
    # Clean up old batch files
    for f in seed_files:
        os.remove(f)
        
    batch_size = 50
    for i in range(0, len(final_terms), batch_size):
        batch_num = (i // batch_size) + 1
        batch_data = final_terms[i:i + batch_size]
        new_file = f'backend/app/seeds/glossary_batch_{batch_num}.json'
        with open(new_file, 'w', encoding='utf-8') as f:
            json.dump(batch_data, f, ensure_ascii=False, indent=2)
            
    print(f"Saved {len(final_terms)} terms into {((len(final_terms)-1)//batch_size)+1} batch files.")

if __name__ == "__main__":
    run_fixer()
