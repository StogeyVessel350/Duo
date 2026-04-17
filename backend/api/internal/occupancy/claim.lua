-- Occupancy claim — atomic via single Redis Lua evaluation.
-- See docs/phase_3_backend_architecture.md §6.2
--
-- KEYS[1] = occ:user:{user_id}
-- KEYS[2] = occ:mach:{machine_id}
-- ARGV[1] = claim_id
-- ARGV[2] = user_id
-- ARGV[3] = machine_id
-- ARGV[4] = ttl_seconds

if redis.call('EXISTS', KEYS[1]) == 1 then
  return {'conflict_user', redis.call('HGET', KEYS[1], 'machine_id')}
end

if redis.call('EXISTS', KEYS[2]) == 1 then
  return {'conflict_machine', redis.call('HGET', KEYS[2], 'user_id')}
end

redis.call('HSET',   KEYS[1], 'machine_id', ARGV[3], 'claim_id', ARGV[1])
redis.call('EXPIRE', KEYS[1], ARGV[4])
redis.call('HSET',   KEYS[2], 'user_id',    ARGV[2], 'claim_id', ARGV[1])
redis.call('EXPIRE', KEYS[2], ARGV[4])

return {'ok', ARGV[1]}
