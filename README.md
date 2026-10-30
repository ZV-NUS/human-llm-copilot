# Human–LLM Co-Pilot

Language-guided shared decision-making for intelligent vehicles.

**[Interactive project page](https://zv-nus.github.io/human-llm-copilot/)** · [V2 video: English](media/v2/human_llm_copilot_demo_v2_en.mp4) / [中文](media/v2/human_llm_copilot_demo_v2_zh.mp4) · [One-page brief: English](media/v2/project_brief_v2_en.pdf) / [中文](media/v2/project_brief_v2_zh.pdf) · [中文](https://zv-nus.github.io/human-llm-copilot/?lang=zh) · [English](https://zv-nus.github.io/human-llm-copilot/?lang=en)

An overtaking goal leaves choices about timing, smoothness and energy. V2 follows one complete case through moving traffic, a driver instruction, candidate evaluation, feedback, replanning and execution.

## Follow the case

1. A slower lead vehicle and a passing target-lane vehicle constrain the overtaking opportunity. All five surrounding vehicles participate in native planning and simulation.
2. A goal button specifies overtaking. Local Qwen 9B interprets the current-task smoothness and energy preferences; the existing binding program structures those attributes.
3. The scripted driver evaluates two candidates predicted at the same time: A finishes at 26 s with a 3.5 s lane transition; B finishes at 29 s with a 3.5 s transition.
4. A comparison favors B, followed by an acceptability response concerning a separate 26 s / 4.5 s candidate. Both are button feedback events.
5. Combining both evaluations and the current vehicle state, the system replans a 29 s / 4.5 s execution. The overtake goal is retained.
6. Recorded execution is shown alongside candidate forecasts and complete-task model energy. A synchronized first-person view is available as a secondary view.

The episode uses scripted software feedback and one recorded local Qwen 9B call. It is an isolated simulation demonstration, not an independent paper validation or a human-study result. The browser replays saved records without a live model or vehicle connection.

## Version and media

The current webpage, **two 60-second portrait videos** and **two one-page briefs** use the same **V2 five-vehicle episode**.

- Webpage language: Chinese / English.
- English video: English visuals and Ryan English narration.
- Chinese video: Chinese narration by Yunxi, with Chinese/English visual explanations.
- Both videos offer optional Chinese and English captions; English is the default video edition.
- Briefs: one page each, in English and Chinese.

Video edition and caption language can be selected separately from the webpage language.

The original [75-second V1 video](media/human_llm_copilot_demo.mp4) and [V1 brief](media/project_brief.pdf) remain unchanged. V1 webpage source is preserved at commit `b3a0b01978f171adc07f1ee0489179382da528b7`.

## Scope and provenance

This public repository contains the presentation page, selected derived replay records and rendering assets. Research implementation is maintained separately in a private repository.

- [V2 replay provenance](data/demo_provenance.json)
- [V1 replay provenance](data/provenance.json)
- [Rendering credits](credits.html): vehicle model byｍononofu (CC BY 4.0), Poly Haven surfaces/sky (CC0), and Three.js (MIT).

Original research gates, error bands, four-request budget and continuous 33 s task clock are retained. Presentation playback speed does not alter the recorded native task time.

## View locally

Run `python3 -m http.server 8080`, then open `http://127.0.0.1:8080`. The site is static and GitHub Pages compatible.

## License

Authored presentation code uses the MIT license. Third-party assets retain their separate terms. Derived replay data are provided for this recorded demonstration.
