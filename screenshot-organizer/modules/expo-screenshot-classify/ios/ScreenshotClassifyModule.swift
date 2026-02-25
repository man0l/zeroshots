import ExpoModulesCore
import Vision
import UIKit

public class ScreenshotClassifyModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoScreenshotClassify")

    AsyncFunction("classifyImageAsync") { (uri: String) -> [String] in
      return await classifyImage(uri: uri)
    }
  }

  /// Classifies an image at the given URI. Supports `file://` paths only; callers must resolve `ph://` (Photos library) to a file path first.
  private func classifyImage(uri: String) async -> [String] {
    let filePath: String
    if uri.hasPrefix("file://") {
      filePath = String(uri.dropFirst(7))
    } else {
      filePath = uri
    }
    guard FileManager.default.fileExists(atPath: filePath),
          let image = UIImage(contentsOfFile: filePath),
          let cgImage = image.cgImage else {
      return []
    }
    return await withCheckedContinuation { continuation in
      let request = VNClassifyImageRequest()
      request.revision = VNClassifyImageRequestRevision1
      let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
      do {
        try handler.perform([request])
        let results = request.results ?? []
        let labels = results
          .compactMap { $0 as? VNClassificationObservation }
          .filter { $0.confidence > 0.1 }
          .sorted { $0.confidence > $1.confidence }
          .prefix(15)
          .map { $0.identifier }
        continuation.resume(returning: Array(labels))
      } catch {
        continuation.resume(returning: [])
      }
    }
  }
}
