import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/app_state.dart';
import '../../core/media.dart';
import '../../core/theme.dart';
import '../../widgets/brand.dart';
import '../splash/splash_screen.dart';

class _Page {
  final String image;
  final String kicker;
  final String title;
  final String italic;
  final String body;
  final ({String hi, String en})? caption;
  const _Page(this.image, this.kicker, this.title, this.italic, this.body, [this.caption]);
}

const _pages = [
  _Page(
    Media.callPoster,
    'Real-time video calls',
    'Break language barriers ',
    'in real time.',
    'Video calls where each person speaks their own language, with live captions and translated voice.',
    (hi: 'अरे! आपका हफ़्ता कैसा रहा?', en: 'Hey! How was your week?'),
  ),
  _Page(
    Media.family,
    'Made for real conversations',
    'Speak your language. ',
    'We’ll translate the rest.',
    'Call family abroad, see a doctor far from home, or study with classmates from other states.',
  ),
  _Page(
    Media.balcony,
    'Built for India first',
    'Every language is ',
    'someone’s home.',
    'English, Hindi, Telugu and Tamil first, with Gujarati, Kannada, Malayalam, Bengali and Marathi planned.',
  ),
];

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _controller = PageController();
  int _index = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _finish(String route) {
    AppState.instance.prefs?.setBool(onboardedKey, true);
    context.go(route);
  }

  @override
  Widget build(BuildContext context) {
    final last = _index == _pages.length - 1;
    return Scaffold(
      body: Column(
        children: [
          Expanded(
            child: PageView.builder(
              controller: _controller,
              itemCount: _pages.length,
              onPageChanged: (i) => setState(() => _index = i),
              itemBuilder: (context, i) => _PageView(page: _pages[i]),
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 12, 24, 16),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(_pages.length, (i) {
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 220),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        width: i == _index ? 22 : 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: i == _index ? Brand.marigold500 : context.colors.line,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: last
                          ? () => _finish('/register')
                          : () => _controller.nextPage(duration: const Duration(milliseconds: 320), curve: Curves.easeOutCubic),
                      child: Text(last ? 'Create an account' : 'Next'),
                    ),
                  ),
                  TextButton(onPressed: () => _finish('/login'), child: const Text('I already have an account')),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PageView extends StatelessWidget {
  final _Page page;
  const _PageView({required this.page});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, box) {
        final imageHeight = box.maxHeight * 0.56;
        return SingleChildScrollView(
          physics: const ClampingScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                height: imageHeight,
                width: double.infinity,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.asset(page.image, fit: BoxFit.cover),
                    const DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [Color(0x66000000), Color(0x00000000), Color(0x00000000)],
                          stops: [0, 0.3, 1],
                        ),
                      ),
                    ),
                    const SafeArea(
                      child: Padding(padding: EdgeInsets.all(16), child: Logo(size: 30, textColor: Colors.white)),
                    ),
                    if (page.caption != null)
                      Positioned(
                        left: 24,
                        right: 24,
                        bottom: 18,
                        child: Center(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.7), borderRadius: BorderRadius.circular(8)),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(page.caption!.hi, style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w500)),
                                Text('“${page.caption!.en}”', style: const TextStyle(color: Colors.white60, fontSize: 11)),
                              ],
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(page.kicker, style: TextStyle(color: context.accent, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    Text.rich(
                      TextSpan(children: [
                        TextSpan(text: page.title),
                        TextSpan(text: page.italic, style: const TextStyle(fontStyle: FontStyle.italic)),
                      ]),
                      style: AppTheme.serif(38, color: context.colors.fg),
                    ),
                    const SizedBox(height: 12),
                    Text(page.body, style: TextStyle(color: context.colors.muted, fontSize: 16, height: 1.45)),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
