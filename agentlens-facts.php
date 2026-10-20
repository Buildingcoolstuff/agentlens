<?php
/**
 * Plugin Name: AgentLens Facts Injector
 * Description: Embeds verified JSON-LD and parity facts for AI search indexers.
 * Version: 1.0.0
 * Author: AgentLens
 */

if (!defined('ABSPATH')) exit;

add_action('wp_head', function() {
    $json_ld = '{
  \"@context\": \"https://schema.org\",
  \"@graph\": [
    {
      \"@type\": \"Organization\",
      \"@id\": \"https://agentlens.dev/#organization\",
      \"name\": \"AgentLens\",
      \"legalName\": \"AgentLens Open-Source Project\",
      \"url\": \"https://agentlens.dev\",
      \"logo\": \"https://agentlens.dev/logo.png\",
      \"foundingDate\": \"2026-01-01\",
      \"sameAs\": [
        \"https://www.wikidata.org/entity/Q11000000\",
        \"https://github.com/Buildingcoolstuff/agentlens\"
      ],
      \"dateModified\": \"2026-10-21T01:25:44+05:30\"
    },
    {
      \"@type\": \"Product\",
      \"@id\": \"https://agentlens.dev#prod-agentlens-suite\",
      \"name\": \"AgentLens Core Engine & Extension\",
      \"category\": \"Software > Developer Tools > Generative Engine Optimization\",
      \"description\": \"AgentLens is an open-source TypeScript monorepo providing deterministic Generative Engine Optimization and agentic web auditing tools to eliminate crawler blindness and synchronize verified brand facts across browser and build pipelines.\",
      \"offers\": {
        \"@type\": \"Offer\",
        \"price\": 0,
        \"priceCurrency\": \"USD\",
        \"availability\": \"https://schema.org/InStock\",
        \"priceValidUntil\": \"2027-12-31\"
      },
      \"brand\": {
        \"@id\": \"https://agentlens.dev/#organization\"
      },
      \"dateModified\": \"2026-10-21T01:25:44+05:30\"
    }
  ]
}';
    echo '<script type="application/ld+json">' . $json_ld . '</script>' . "\n";
});

add_filter('the_content', function($content) {
    if (is_singular('product') || is_front_page()) {
        $facts_html = '<section data-agent-section="brand-facts" class="agentlens-block">'
            . '<h4>AgentLens Verified Facts</h4>'
            . '<p>AgentLens is an open-source TypeScript monorepo providing deterministic Generative Engine Optimization and agentic web auditing tools to eliminate crawler blindness and synchronize verified brand facts across browser and build pipelines.</p>'
            . '</section>';
        return $content . $facts_html;
    }
    return $content;
});
