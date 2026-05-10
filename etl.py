import csv
import os
import re
from datetime import datetime

# Configuration
RAW_DATA_DIR = 'data/raw'
CLEAN_DATA_DIR = 'data/clean'
STORES = ['lidl', 'pam', 'esselunga', 'conad']

def normalize_price(price_str):
    if not price_str:
        return 0.0
    # Remove "EUR", "€", and whitespace
    clean_price = re.sub(r'[E€UR\s]', '', price_str)
    # Replace comma with dot
    clean_price = clean_price.replace(',', '.')
    try:
        return float(clean_price)
    except ValueError:
        return 0.0

def normalize_date(date_str):
    if not date_str:
        return datetime.now().isoformat()
    
    # Try different formats
    formats = [
        '%d-%m-%Y',          # 11-02-2026
        '%Y/%m/%d %H:%M',    # 2026/01/06 23:58
        '%Y-%m-%d %H:%M:%S', # 2026-02-15 10:00:00
        '%Y-%m-%d',          # 2026-02-15
        '%d/%m/%Y',          # 20/01/2026
    ]
    
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.isoformat()
        except ValueError:
            continue
            
    return datetime.now().isoformat()

def normalize_city(city_str):
    if not city_str:
        return 'Milan'
    if city_str.lower().strip() in ['milano', 'milan']:
        return 'Milan'
    return city_str

def process_file(store_name):
    # Search for the file that starts with store_name
    input_files = [f for f in os.listdir(RAW_DATA_DIR) if f.startswith(store_name) and f.endswith('.csv')]
    if not input_files:
        print(f"File not found for store: {store_name}")
        return
    
    input_file = os.path.join(RAW_DATA_DIR, input_files[0])
    output_file = os.path.join(CLEAN_DATA_DIR, f'{store_name}_cleaned.csv')
    
    print(f"Processing {input_file}...")

    with open(input_file, mode='r', encoding='utf-8') as infile:
        reader = csv.DictReader(infile)
        cleaned_data = []
        
        for row in reader:
            cleaned_row = {
                'canonical_product_id': row['canonical_product_id'],
                'store_name': row.get('store_name', store_name.capitalize()).strip(),
                'product_name': row['product_name'],
                'brand': row['brand'],
                'price_eur': normalize_price(row['price_eur']),
                'last_updated': normalize_date(row['last_updated']),
                'city': normalize_city(row.get('city', 'Milan'))
            }
            cleaned_data.append(cleaned_row)
            
    # Write to clean CSV
    os.makedirs(CLEAN_DATA_DIR, exist_ok=True)
    with open(output_file, mode='w', encoding='utf-8', newline='') as outfile:
        fieldnames = ['product_id', 'store_name', 'product_name', 'brand', 'price_eur', 'last_updated', 'city']
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        writer.writeheader()
        
        for row in cleaned_data:
            # Map canonical_product_id to product_id
            writer.writerow({
                'product_id': row['canonical_product_id'],
                'store_name': row['store_name'],
                'product_name': row['product_name'],
                'brand': row['brand'],
                'price_eur': row['price_eur'],
                'last_updated': row['last_updated'],
                'city': row['city']
            })
    
    print(f"Successfully cleaned {len(cleaned_data)} records for {store_name}.")

def main():
    all_products = {} # id -> {name, brand}
    
    for store in STORES:
        # Search for the file that starts with store_name
        input_files = [f for f in os.listdir(RAW_DATA_DIR) if f.startswith(store) and f.endswith('.csv')]
        if not input_files:
            continue
        
        input_file = os.path.join(RAW_DATA_DIR, input_files[0])
        print(f"Reading products from {input_file}...")
        
        with open(input_file, mode='r', encoding='utf-8') as infile:
            reader = csv.DictReader(infile)
            for row in reader:
                pid = row['canonical_product_id']
                if pid not in all_products:
                    all_products[pid] = {
                        'id': pid,
                        'name': row['product_name'],
                        'brand': row['brand']
                    }
    
    # Write unique products to products_import.csv
    products_file = os.path.join(CLEAN_DATA_DIR, 'products_import.csv')
    os.makedirs(CLEAN_DATA_DIR, exist_ok=True)
    with open(products_file, mode='w', encoding='utf-8', newline='') as outfile:
        writer = csv.DictWriter(outfile, fieldnames=['id', 'name', 'brand'])
        writer.writeheader()
        for pid in sorted(all_products.keys()):
            writer.writerow(all_products[pid])
    
    print(f"Generated {len(all_products)} unique products in {products_file}")

    # Process store files as before
    for store in STORES:
        process_file(store)

if __name__ == '__main__':
    main()
