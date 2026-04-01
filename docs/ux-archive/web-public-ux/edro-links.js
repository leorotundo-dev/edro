(function () {
  const clientId = 'azul';
  const normalize = (text) => (text || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const map = {
    'home': '/',
    'dashboard': '/',
    'voltar ao inicio': '/',
    'voltar ao início': '/',
    'biblioteca': '/clients/azul/library',
    'brand assets': '/clients/azul/library',
    'campanhas': '/clients/azul/planning',
    'meus projetos': '/clients',
    'clients': '/clients',
    'calendar': '/calendar',
    'kanban': '/board',
    'creative studio': '/studio',
    'platform selector': '/studio/platforms',
    'clipping': '/clipping',
    'radar': '/clipping',
    'library': '/clients/azul/library',
    'insights': '/clients/azul/insights',
    'performance': '/clients/azul/performance',
    'enter creative studio': '/studio/editor',
    'continue to format selection': '/studio/platforms',
    'back to strategy': '/studio',
    'review outputs': '/studio/review',
    'creative studio review': '/studio/review',
    'revisar outputs': '/studio/review',
    'revisao de outputs': '/studio/review',
    'settings': '/settings',
    'support': '/support',
    'view roadmap': '/calendar',
    'open calendar': '/calendar',
    'create post': '/studio',
    'view in calendar': '/calendar',
    'create client': '/clients/new',
    'add client': '/clients/new',
    'open client': '/clients',
    'back to overview': '/clients/azul',
    'overview': '/clients/azul',
    'planning': '/clients/azul/planning',
    'client planning': '/clients/azul/planning',
    'client clipping': '/clients/azul/clipping',
    'client radar': '/clients/azul/clipping',
    'client library': '/clients/azul/library',
    'client insights': '/clients/azul/insights',
    'client performance': '/clients/azul/performance'
    ,
    'abrir no editor': '/studio/editor',
    'voltar ao editor': '/studio/editor'
  };

  const extractLabel = (el) => {
    const directLabel = el.getAttribute('data-label') || el.getAttribute('aria-label') || el.getAttribute('title');
    if (directLabel) return directLabel;

    const labelNode = el.querySelector('span:not(.material-symbols-outlined)');
    if (labelNode && labelNode.textContent) return labelNode.textContent;

    return el.textContent || '';
  };

  const resolveRoute = (el) => {
    const direct = el.getAttribute('data-route') || el.getAttribute('data-href');
    if (direct) return direct;

    const rawLabel = extractLabel(el);
    const label = normalize(rawLabel.replace(/\d+/g, ''));
    if (map[label]) return map[label];

    if (label === 'client' || label === 'client overview') return `/clients/${clientId}`;
    return null;
  };

  const navigate = (route) => {
    if (!route) return;
    const target = window.top || window;
    target.location.href = route;
  };

  const bind = (el) => {
    const route = resolveRoute(el);
    if (!route) return;

    if (el.tagName.toLowerCase() === 'a') {
      el.setAttribute('href', route);
      el.setAttribute('target', '_top');
      el.setAttribute('data-edro-link', 'true');
      el.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        navigate(route);
      });
    } else {
      el.setAttribute('data-edro-link', 'true');
      el.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        navigate(route);
      });
    }
  };

  document.querySelectorAll('a, button, [role="button"], [data-link], [data-route], [data-href]').forEach(bind);
})();
