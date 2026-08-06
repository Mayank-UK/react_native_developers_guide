import {
  AuthFailure,
  CacheFailure,
  DatabaseFailure,
  type Failure,
  FailureSeverity,
  NetworkFailure,
  ServerFailure,
  UnknownFailure,
} from './failures';

describe('Failure subclasses', () => {
  it('carry their default severities and kinds', () => {
    expect(new NetworkFailure().severity).toBe(FailureSeverity.Critical);
    expect(new ServerFailure().severity).toBe(FailureSeverity.Critical);
    expect(new DatabaseFailure().severity).toBe(FailureSeverity.Critical);
    expect(new UnknownFailure().severity).toBe(FailureSeverity.Critical);
    expect(new AuthFailure().severity).toBe(FailureSeverity.Warning);
    expect(new CacheFailure().severity).toBe(FailureSeverity.Warning);
    expect(new CacheFailure('m', undefined, FailureSeverity.Critical).severity).toBe(
      FailureSeverity.Critical,
    );
  });

  it('joins the cause chain in message and chain', () => {
    const net = new NetworkFailure('net down');
    const server = new ServerFailure('server then failed', net);
    expect(server.message).toContain('net down');
    expect(server.chain).toContain('caused by');
    expect(server.cause).toBe(net);
  });
});

describe('Failure.withSeverity', () => {
  it('overrides only severity; delegates kind, message, chain, and cause', () => {
    const net = new NetworkFailure('No internet connection');
    const downgraded = net.withSeverity(FailureSeverity.Warning);

    expect(downgraded.severity).toBe(FailureSeverity.Warning);
    // Delegated, not recomputed.
    expect(downgraded.kind).toBe(net.kind);
    expect(downgraded.message).toBe(net.message);
    expect(downgraded.chain).toBe(net.chain);
    // Cause chain preserved by reference (no copy / no re-map).
    expect(downgraded.cause).toBe(net.cause);
  });

  it('preserves a multi-link cause chain by reference', () => {
    const net = new NetworkFailure('net down');
    const server = new ServerFailure('server failed', net);
    const downgraded = server.withSeverity(FailureSeverity.Warning);

    expect(downgraded.cause).toBe(server.cause);
    expect(downgraded.cause).toBe(net);
    expect(downgraded.message).toBe(server.message);
    expect(downgraded.message).toContain('net down');
  });

  it('is non-blocking after a Critical→Warning downgrade', () => {
    const downgraded = new NetworkFailure().withSeverity(FailureSeverity.Warning);
    expect(downgraded.severity).toBe(FailureSeverity.Warning);
    expect(downgraded.severity).not.toBe(FailureSeverity.Critical);
  });
});
