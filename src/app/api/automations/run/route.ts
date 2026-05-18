import { runAutomationRules } from '@/lib/automation-engine';

export async function POST() {
  try {
    const results = await runAutomationRules();
    const totalTriggered = results.reduce((sum, r) => sum + r.triggered, 0);

    return Response.json({
      success: true,
      total_triggered: totalTriggered,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
