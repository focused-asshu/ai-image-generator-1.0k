import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster, toast } from "sonner";
import { useState } from "react";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <h2 className="text-xl font-semibold text-primary">AI Image Generator</h2>
        <SignOutButton />
      </header>
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <Content />
        </div>
      </main>
      <Toaster />
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-primary mb-4">AI Image Generator</h1>
        <Authenticated>
          <p className="text-xl text-secondary">
            Create amazing images with AI, {loggedInUser?.email ?? "friend"}!
          </p>
        </Authenticated>
        <Unauthenticated>
          <p className="text-xl text-secondary">Sign in to start generating images</p>
        </Unauthenticated>
      </div>

      <Authenticated>
        <ImageGenerator />
        <ImageGallery />
      </Authenticated>

      <Unauthenticated>
        <div className="max-w-md mx-auto">
          <SignInForm />
        </div>
      </Unauthenticated>
    </div>
  );
}

function ImageGenerator() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const generateImage = useMutation(api.images.generateImage);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      await generateImage({ prompt: prompt.trim() });
      toast.success("Image generation started! Check your gallery below.");
      setPrompt("");
    } catch (error) {
      toast.error("Failed to start image generation");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h2 className="text-2xl font-semibold mb-4">Generate New Image</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
            Describe the image you want to create
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A serene mountain landscape at sunset with a crystal clear lake reflecting the orange and pink sky..."
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow shadow-sm hover:shadow resize-none"
            rows={3}
            disabled={isGenerating}
          />
        </div>
        <button
          type="submit"
          disabled={!prompt.trim() || isGenerating}
          className="w-full px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? "Generating..." : "Generate Image"}
        </button>
      </form>
    </div>
  );
}

function ImageGallery() {
  const images = useQuery(api.images.getUserImages) || [];

  if (images.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <h2 className="text-2xl font-semibold mb-4">Your Images</h2>
        <p className="text-gray-500">No images generated yet. Create your first image above!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h2 className="text-2xl font-semibold mb-6">Your Images</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map((image) => (
          <ImageCard key={image._id} image={image} />
        ))}
      </div>
    </div>
  );
}

function ImageCard({ image }: { image: any }) {
  return (
    <div className="bg-gray-50 rounded-lg overflow-hidden shadow-sm border">
      <div className="aspect-square bg-gray-100 flex items-center justify-center">
        {image.status === "generating" && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Generating...</p>
          </div>
        )}
        {image.status === "completed" && image.url && (
          <img
            src={image.url}
            alt={image.prompt}
            className="w-full h-full object-cover"
          />
        )}
        {image.status === "failed" && (
          <div className="text-center text-red-500">
            <p className="text-sm">Generation failed</p>
            {image.error && (
              <p className="text-xs mt-1 text-gray-500">{image.error}</p>
            )}
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-700 line-clamp-3">{image.prompt}</p>
        <p className="text-xs text-gray-500 mt-2">
          {new Date(image._creationTime).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
