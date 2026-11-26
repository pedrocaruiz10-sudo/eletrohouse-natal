// Vercel serverless: cria preferência do Mercado Pago (Checkout Pro).
// O Access Token fica SÓ em process.env.MP_ACCESS_TOKEN (nunca no front).
const PRODUTOS = {
  arvore: { nome: 'Árvore de Natal Pinheiro Canadense Verde 1,50m', preco: 127.0, oferta: 49.9 },
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'method' });
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ erro: 'MP_ACCESS_TOKEN ausente' });

  const { itens, cliente } = req.body || {};
  if (!Array.isArray(itens) || !itens.length) return res.status(400).json({ erro: 'sem itens' });

  const items = [];
  for (const i of itens) {
    const p = PRODUTOS[i.id];
    const qtd = Math.min(Math.max(parseInt(i.qtd, 10) || 0, 0), 20);
    if (!p || !qtd) return res.status(400).json({ erro: 'item inválido' });
    items.push({
      title: p.nome,
      quantity: qtd,
      currency_id: 'BRL',
      unit_price: p.oferta || p.preco,
    });
  }

  const c = cliente || {};
  const origem = 'https://' + req.headers.host;
  const body = {
    items,
    payer: { name: c.nome, email: c.email },
    shipments: {
      receiver_address: {
        zip_code: String(c.cep || '').replace(/\D/g, ''),
        street_name: c.rua,
        street_number: String(c.num || ''),
      },
    },
    back_urls: { success: origem + '/?pago=1', pending: origem + '/?pago=pendente', failure: origem + '/?pago=0' },
    auto_return: 'approved',
    statement_descriptor: 'ELETROHOUSE',
    metadata: { cliente: c },
  };

  try {
    const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ erro: 'mp', detalhe: j.message || j });
    return res.status(200).json({ url: j.init_point });
  } catch (e) {
    return res.status(502).json({ erro: 'rede' });
  }
};
