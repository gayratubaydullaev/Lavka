import 'dart:html' as html;

void initWebViewportFix() {
  final vv = html.window.visualViewport;
  if (vv == null) return;

  var lastHeight = vv.height ?? 0;

  void sync([html.Event? _]) {
    final height = vv.height ?? lastHeight;
    if (height >= lastHeight) {
      html.window.scrollTo(0, 0);
      html.window.dispatchEvent(html.Event('resize'));
    }
    lastHeight = height;
  }

  vv.onResize.listen(sync);
  vv.onScroll.listen(sync);
  html.document.onBlur.listen((_) => Future.delayed(const Duration(milliseconds: 50), sync));
}
