package uz.jomboy.lavka.core.database

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.RoomDatabase

@Entity(tableName = "outbox_events")
data class OutboxEvent(
    @PrimaryKey val id: String,
    val type: String,
    val payload: String,
    val idempotencyKey: String,
    val createdAt: Long,
    val synced: Boolean = false,
)

@Dao
interface OutboxDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(event: OutboxEvent)

    @Query("SELECT * FROM outbox_events WHERE synced = 0 ORDER BY createdAt ASC")
    suspend fun pending(): List<OutboxEvent>

    @Query("UPDATE outbox_events SET synced = 1 WHERE id = :id")
    suspend fun markSynced(id: String)
}

@Entity(tableName = "cached_barcodes")
data class CachedBarcode(
    @PrimaryKey val barcode: String,
    val productId: String,
    val productName: String,
)

@Dao
interface BarcodeCacheDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(items: List<CachedBarcode>)

    @Query("SELECT * FROM cached_barcodes WHERE barcode = :barcode LIMIT 1")
    suspend fun find(barcode: String): CachedBarcode?
}

@Database(entities = [OutboxEvent::class, CachedBarcode::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun outboxDao(): OutboxDao
    abstract fun barcodeCacheDao(): BarcodeCacheDao
}
