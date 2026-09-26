import ImageIO
import SwiftUI
import UIKit

/// The system camera. SwiftUI's PhotosPicker covers the library but has no
/// camera, so this wraps UIImagePickerController.
struct CameraPicker: UIViewControllerRepresentable {
    let onCapture: (UIImage) -> Void
    /// Called on capture or cancel; the presenter closes the cover.
    let onFinish: () -> Void

    static var isAvailable: Bool { UIImagePickerController.isSourceTypeAvailable(.camera) }

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraPicker
        init(_ parent: CameraPicker) { self.parent = parent }

        func imagePickerController(
            _ picker: UIImagePickerController,
            didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
        ) {
            if let image = info[.originalImage] as? UIImage {
                parent.onCapture(PhotoProcessing.downscaled(image))
            }
            parent.onFinish()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.onFinish()
        }
    }
}

enum PhotoProcessing {
    /// Longest edge after downscaling. A 12 MP phone photo is 4-6 MB; this
    /// keeps uploads around 0.5-1 MB on a cellular connection at the site,
    /// which is plenty to read a label or a crack.
    static let maxDimension: CGFloat = 2048

    /// Downscale a captured image. Drawing through the renderer also bakes
    /// in the orientation, so the stored file isn't sideways on web. Done at
    /// capture time so full-resolution bitmaps (~48 MB each for 12 MP) are
    /// never held while the user writes a caption.
    static func downscaled(_ image: UIImage) -> UIImage {
        let size = image.size
        let scale = min(1, maxDimension / max(size.width, size.height))
        guard scale < 1 || image.imageOrientation != .up else { return image }
        let target = CGSize(width: (size.width * scale).rounded(), height: (size.height * scale).rounded())
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        return UIGraphicsImageRenderer(size: target, format: format).image { _ in
            image.draw(in: CGRect(origin: .zero, size: target))
        }
    }

    /// Downscale straight from encoded library data with ImageIO, which
    /// never decodes the full-size bitmap. Applies the EXIF orientation.
    static func downscaled(data: Data) -> UIImage? {
        guard let source = CGImageSourceCreateWithData(data as CFData, nil) else { return nil }
        let options: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: maxDimension,
        ]
        guard let cgImage = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else { return nil }
        return UIImage(cgImage: cgImage)
    }

    /// Downscale (a no-op for images already downscaled) and JPEG-encode.
    static func jpeg(from image: UIImage, quality: CGFloat = 0.8) -> Data? {
        downscaled(image).jpegData(compressionQuality: quality)
    }
}
