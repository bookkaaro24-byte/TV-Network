export async function POST(req: Request) {
  try {
    const { channelId } = await req.json().catch(() => ({}));

    const relayProcesses = global.__simulcastRelayProcesses;

    if (!relayProcesses) {
      return Response.json({
        success: true,
        message: 'No active relay processes found.',
      });
    }

    if (channelId) {
      const active = relayProcesses.get(channelId);
      if (active) {
        try {
          process.kill(active.pid, 'SIGTERM');
        } catch (err: any) {
          console.warn(`Could not kill pid ${active.pid}:`, err.message);
        }
        relayProcesses.delete(channelId);
        return Response.json({
          success: true,
          channelId,
          terminatedPid: active.pid,
          message: `Simulcast relay for channel ${channelId} stopped.`,
        });
      }
      return Response.json({
        success: true,
        channelId,
        message: `No active simulcast relay process found for channel ${channelId}.`,
      });
    }

    // Stop all
    const stopped: number[] = [];
    relayProcesses.forEach((proc, key) => {
      try {
        process.kill(proc.pid, 'SIGTERM');
        stopped.push(proc.pid);
      } catch {}
      relayProcesses.delete(key);
    });

    return Response.json({
      success: true,
      stoppedPids: stopped,
      message: `Terminated ${stopped.length} active simulcast relays.`,
    });
  } catch (error: any) {
    return Response.json(
      { error: 'Failed to stop simulcast relay', details: error?.message },
      { status: 500 }
    );
  }
}
