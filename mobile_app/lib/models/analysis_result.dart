class AnalysisResult {
  final double healthIndex;
  final Map<String, double> paramsScores;
  final List<String> gradCamImages;
  final List<dynamic> predictions;

  AnalysisResult({
    required this.healthIndex,
    required this.paramsScores,
    required this.gradCamImages,
    required this.predictions,
  });

  factory AnalysisResult.fromJson(Map<String, dynamic> json) {
    // Parse paramsScores safely
    final scoresMap = json['paramsScores'] as Map<String, dynamic>? ?? {};
    final parsedScores = scoresMap
        .map((key, value) => MapEntry(key, (value as num?)?.toDouble() ?? 0.0));

    return AnalysisResult(
      healthIndex: (json['healthIndex'] as num?)?.toDouble() ?? 0.0,
      paramsScores: parsedScores,
      gradCamImages:
          (json['gradCamImages'] as List<dynamic>?)?.cast<String>() ?? [],
      predictions: (json['predictions'] as List<dynamic>?) ?? [],
    );
  }
}
