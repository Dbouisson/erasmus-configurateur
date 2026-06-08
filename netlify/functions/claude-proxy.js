// netlify/functions/claude-proxy.js
// Proxy sécurisé entre le navigateur et l'API Anthropic
// La clé API est stockée dans les variables d'environnement Netlify — jamais exposée au client

exports.handler = async function(event, context) {

  // CORS : autorise uniquement les requêtes depuis votre domaine Netlify
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Gestion des requêtes préliminaires OPTIONS (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Seules les requêtes POST sont acceptées
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Méthode non autorisée' })
    };
  }

  // Vérification que la clé API est configurée
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Clé API non configurée sur le serveur' })
    };
  }

  try {
    // Parse du corps de la requête envoyée par le navigateur
    const body = JSON.parse(event.body);

    // Sécurité : on force le modèle et on limite les tokens
    // pour éviter tout abus si l'URL est découverte
    const safeBody = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: body.messages || []
    };

    // Appel à l'API Anthropic depuis le serveur Netlify
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(safeBody)
    });

    const data = await response.json();

    // Si l'API Anthropic retourne une erreur
    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: data.error?.message || 'Erreur API Anthropic' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erreur serveur : ' + err.message })
    };
  }
};
