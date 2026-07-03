package uz.jomboy.lavka.core.network

import okhttp3.MultipartBody
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path

data class PickerTaskItem(
    val product_id: String,
    val name: String,
    val zone: String,
    val shelf: String,
    val photo_url: String,
    val quantity: Double,
    val barcode: String,
    val is_weighted: Boolean = false,
    val is_marked: Boolean = false,
)

data class PickerTask(
    val order_id: String,
    val sla_deadline: String,
    val items: List<PickerTaskItem>,
)

data class ScanRequest(val product_id: String, val barcode: String, val measured_weight: Double? = null)

data class ReplacementResponse(val replacement_options: List<Any>, val timeout_seconds: Int)

data class CompleteRequest(val items_scanned: List<String>, val package_id: String, val thermal_bag_id: String? = null)

data class CourierOffer(
    val order_id: String,
    val address_masked: String,
    val amount: Int,
    val earnings: Int,
    val distance_km: Double,
    val weight_kg: Double,
    val expires_at: String,
)

data class DeliverRequest(val photo_url: String, val confirmation_code: String? = null)

interface PickerApi {
    @GET("picker/tasks/next")
    suspend fun getNextTask(): PickerTask

    @POST("picker/tasks/{orderId}/start")
    suspend fun startTask(@Path("orderId") orderId: String)

    @POST("picker/tasks/{orderId}/scan")
    suspend fun scan(@Path("orderId") orderId: String, @Body body: ScanRequest)

    @POST("picker/tasks/{orderId}/replacement")
    suspend fun replacement(@Path("orderId") orderId: String, @Body body: Map<String, String>): ReplacementResponse

    @POST("picker/tasks/{orderId}/complete")
    suspend fun complete(@Path("orderId") orderId: String, @Body body: CompleteRequest)

    @GET("picker/stats")
    suspend fun stats(): Map<String, Any>

    @POST("catalog/asl-belgisi/verify")
    suspend fun verifyAsl(@Body body: Map<String, String>): Map<String, Any>
}

interface CourierApi {
    @GET("courier/offers")
    suspend fun getOffers(): Map<String, List<CourierOffer>>

    @POST("courier/offers/{orderId}/accept")
    suspend fun acceptOffer(@Path("orderId") orderId: String)

    @POST("courier/offers/{orderId}/skip")
    suspend fun skipOffer(@Path("orderId") orderId: String)

    @POST("courier/shift")
    suspend fun shift(@Body body: Map<String, String>): Map<String, Any>

    @GET("courier/orders/active")
    suspend fun activeOrders(): Map<String, List<Any>>

    @POST("courier/orders/{orderId}/status/pickup")
    suspend fun pickup(@Path("orderId") orderId: String, @Body body: Map<String, String>? = null)

    @POST("courier/orders/{orderId}/status/arrived")
    suspend fun arrived(@Path("orderId") orderId: String)

    @POST("courier/orders/{orderId}/status/delivered")
    suspend fun delivered(@Path("orderId") orderId: String, @Body body: DeliverRequest)

    @POST("courier/orders/{orderId}/problem")
    suspend fun problem(@Path("orderId") orderId: String, @Body body: Map<String, String>)

    @POST("courier/location")
    suspend fun location(@Body body: Map<String, Any>)

    @GET("courier/stats")
    suspend fun stats(): Map<String, Any>

    @GET("courier/demand-heatmap")
    suspend fun getDemandHeatmap(): Map<String, Any>

    @POST("courier/iot/temperature")
    suspend fun reportTemperature(@Body body: Map<String, Any>)

    @Multipart
    @POST("courier/uploads")
    suspend fun uploadPhoto(@Part photo: MultipartBody.Part): Map<String, Any>
}

object ApiClient {
    fun createPickerApi(token: String? = null): PickerApi = retrofit(token).create(PickerApi::class.java)
    fun createCourierApi(token: String? = null): CourierApi = retrofit(token).create(CourierApi::class.java)

    private fun retrofit(token: String?) = retrofit2.Retrofit.Builder()
        .baseUrl(ApiConfig.baseUrl)
        .client(
            okhttp3.OkHttpClient.Builder()
                .addInterceptor { chain ->
                    val builder = chain.request().newBuilder()
                    token?.let { builder.addHeader("Authorization", "Bearer $it") }
                    chain.proceed(builder.build())
                }
                .addInterceptor(okhttp3.logging.HttpLoggingInterceptor().apply {
                    level = okhttp3.logging.HttpLoggingInterceptor.Level.BASIC
                })
                .build()
        )
        .addConverterFactory(retrofit2.converter.gson.GsonConverterFactory.create())
        .build()
}
