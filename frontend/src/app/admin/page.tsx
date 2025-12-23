"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface UserProfile {
  uid: string;
  email: string;
  role: string;
}

interface FeaturedMoviesResponse {
  movieIds: number[];
}

export default function AdminDashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [featuredMovies, setFeaturedMovies] = useState<number[]>([]);
  const [movieId, setMovieId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
      return;
    }

    if (user) {
      fetchUserProfile();
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      fetchFeaturedMovies();
    }
  }, [userProfile]);

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }

      const profile: UserProfile = await response.json();
      setUserProfile(profile);

      if (profile.role !== 'admin') {
        router.push("/");
        return;
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load user profile");
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const fetchFeaturedMovies = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/featured`);

      if (!response.ok) {
        throw new Error("Failed to fetch featured movies");
      }

      const data: FeaturedMoviesResponse = await response.json();
      setFeaturedMovies(data.movieIds);
    } catch (error) {
      console.error("Error fetching featured movies:", error);
      toast.error("Failed to load featured movies");
    }
  };

  const handleAddFeaturedMovie = async () => {
    if (!movieId.trim()) {
      toast.error("Please enter a movie ID");
      return;
    }

    const id = parseInt(movieId.trim(), 10);
    if (isNaN(id) || id <= 0) {
      toast.error("Please enter a valid positive integer for movie ID");
      return;
    }

    setIsLoading(true);
    try {
      const token = await user!.getIdToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/featured`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ movieId: id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add featured movie");
      }

      toast.success("Movie added to featured list successfully");
      setMovieId("");
      fetchFeaturedMovies(); // Refresh the list
    } catch (error) {
      console.error("Error adding featured movie:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add featured movie");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFeaturedMovie = async (movieIdToRemove: number) => {
    setIsLoading(true);
    try {
      const token = await user!.getIdToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/featured/${movieIdToRemove}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to remove featured movie");
      }

      toast.success("Movie removed from featured list successfully");
      fetchFeaturedMovies(); // Refresh the list
    } catch (error) {
      console.error("Error removing featured movie:", error);
      toast.error(error instanceof Error ? error.message : "Failed to remove featured movie");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Failed to logout");
    }
  };

  if (loading || isLoadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return null; // Will redirect in useEffect
  }

  if (userProfile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/")} className="w-full">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">Manage featured movies</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add Featured Movie</CardTitle>
            <CardDescription>
              Enter a TMDB movie ID to feature it on the homepage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                type="number"
                placeholder="Enter TMDB movie ID"
                value={movieId}
                onChange={(e) => setMovieId(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleAddFeaturedMovie}
                disabled={isLoading}
              >
                {isLoading ? "Adding..." : "Feature Movie"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Currently Featured Movies</CardTitle>
            <CardDescription>
              List of movies currently featured on the homepage
            </CardDescription>
          </CardHeader>
          <CardContent>
            {featuredMovies.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No featured movies yet</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {featuredMovies.map((movieId) => (
                  <div
                    key={movieId}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">TMDB ID</Badge>
                      <span className="font-medium">{movieId}</span>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveFeaturedMovie(movieId)}
                      disabled={isLoading}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <Button
            onClick={handleLogout}
            variant="outline"
          >
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
