package uz.jomboy.lavka.picker.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val Primary = Color(0xFF2E7D32)
private val PrimaryLight = Color(0xFF4CAF50)

private val LightColors = lightColorScheme(primary = Primary, secondary = PrimaryLight)

@Composable
fun JomboyTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = LightColors, content = content)
}

fun zoneColor(zone: String): Color = when (zone) {
    "A" -> Color(0xFF4CAF50)
    "B" -> Color(0xFF8BC34A)
    "C" -> Color(0xFF2196F3)
    "D" -> Color(0xFFFF9800)
    "E" -> Color(0xFF00BCD4)
    "F" -> Color(0xFF795548)
    else -> Color.Gray
}
