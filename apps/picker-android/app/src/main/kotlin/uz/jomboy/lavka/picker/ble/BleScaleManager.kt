package uz.jomboy.lavka.picker.ble

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlin.random.Random

/**
 * BLE scale reader (TZ §4.2). Demo mode simulates SPP weight stream when hardware absent.
 */
object BleScaleManager {
    private val _weightKg = MutableStateFlow<Double?>(null)
    val weightKg: StateFlow<Double?> = _weightKg

    private var connected = false

    fun connectDemo() {
        connected = true
        _weightKg.value = 0.0
    }

    fun disconnect() {
        connected = false
        _weightKg.value = null
    }

    fun simulateReading(targetKg: Double = 1.0) {
        if (!connected) connectDemo()
        _weightKg.value = targetKg + Random.nextDouble(-0.02, 0.02)
    }

    fun currentWeight(): Double? = if (connected) _weightKg.value else null
}
