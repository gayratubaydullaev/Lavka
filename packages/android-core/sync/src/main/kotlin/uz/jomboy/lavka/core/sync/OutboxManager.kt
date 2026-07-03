package uz.jomboy.lavka.core.sync

import uz.jomboy.lavka.core.database.OutboxDao
import uz.jomboy.lavka.core.database.OutboxEvent
import java.util.UUID

class OutboxManager(private val dao: OutboxDao) {
    suspend fun enqueue(type: String, payload: String) {
        dao.insert(
            OutboxEvent(
                id = UUID.randomUUID().toString(),
                type = type,
                payload = payload,
                idempotencyKey = UUID.randomUUID().toString(),
                createdAt = System.currentTimeMillis(),
            )
        )
    }

    suspend fun pendingCount(): Int = dao.pending().size

    suspend fun syncAll(syncFn: suspend (OutboxEvent) -> Boolean) {
        dao.pending().forEach { event ->
            if (syncFn(event)) dao.markSynced(event.id)
        }
    }
}
