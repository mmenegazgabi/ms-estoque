import { pool } from '../src/db/pool';

const suppliers = [
  { legal: 'Plus Fashion Confecções LTDA', trade: 'Plus Fashion', doc: '11222333000181', type: 'cnpj',
    email: 'contato@plusfashion.com', phone: '+55 51 99999-0001', contact: 'Maria Silva',
    city: 'Porto Alegre', state: 'RS' },
  { legal: 'Curvas & Estilo Indústria Têxtil LTDA', trade: 'Curvas & Estilo', doc: '45997418000153', type: 'cnpj',
    email: 'vendas@curvaseestilo.com', phone: '+55 11 98888-0002', contact: 'João Souza',
    city: 'São Paulo', state: 'SP' },
  { legal: 'Ana Paula Malhas ME', trade: 'AP Malhas', doc: '52998224725', type: 'cpf',
    email: 'apmalhas@gmail.com', phone: '+55 41 97777-0003', contact: 'Ana Paula',
    city: 'Curitiba', state: 'PR' },
];

async function main() {
  for (const s of suppliers) {
    await pool.query(
      `INSERT INTO suppliers (legal_name, trade_name, document, document_type, email, phone, contact_person, address_city, address_state, address_country)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Brasil')
       ON CONFLICT (document) DO NOTHING`,
      [s.legal, s.trade, s.doc, s.type, s.email, s.phone, s.contact, s.city, s.state],
    );
  }
  console.log(`Seed concluído: ${suppliers.length} fornecedores garantidos.`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
