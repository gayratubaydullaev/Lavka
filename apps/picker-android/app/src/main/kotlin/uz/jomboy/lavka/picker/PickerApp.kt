package uz.jomboy.lavka.picker

import android.app.Application
import uz.jomboy.lavka.core.network.ApiConfig

class PickerApp : Application() {
    override fun onCreate() {
        super.onCreate()
        ApiConfig.baseUrl = BuildConfig.API_BASE_URL
    }
}
