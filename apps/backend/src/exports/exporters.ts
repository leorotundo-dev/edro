export function calendarToCSV(posts: any[]) {
  const header = [
    'date',
    'platform',
    'format',
    'objective',
    'theme',
    'headline',
    'body',
    'cta',
    'tier',
    'score',
  ].join(',');

  const lines = posts.map((post) => {
    const esc = (value: any) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    return [
      post.date,
      post.platform,
      post.format,
      post.objective,
      esc(post.theme),
      esc(post.copy?.headline),
      esc(post.copy?.body),
      esc(post.copy?.cta),
      post.tier,
      post.score,
    ].join(',');
  });

  return [header, ...lines].join('\n');
}

export function calendarToIclipsPayload(posts: any[], client: any) {
  return {
    client_id: client.id,
    client_name: client.name,
    items: posts.map((post: any) => ({
      titulo: `${post.platform} - ${post.format} - ${post.theme}`.slice(0, 120),
      data: post.date,
      plataforma: post.platform,
      formato: post.format,
      objetivo: post.objective,
      copy: {
        headline: post.copy?.headline,
        body: post.copy?.body,
        cta: post.copy?.cta,
      },
      tags: post.event_ids ?? [],
      score: post.score,
      tier: post.tier,
    })),
  };
}
