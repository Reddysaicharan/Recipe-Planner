"use client";

import { useEffect, useState } from "react";
import { format, startOfWeek, addDays, getDay } from "date-fns";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function Home() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [query, setQuery] = useState("chicken");
  const [area, setArea] = useState("");
  const [areas, setAreas] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [expandedRecipe, setExpandedRecipe] = useState<any | null>(null);
  const [plannerTargetRecipe, setPlannerTargetRecipe] = useState<any | null>(null);
  const [plannerDate, setPlannerDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedSlot, setSelectedSlot] = useState("breakfast");
  const [darkMode, setDarkMode] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);

  useEffect(() => {
    fetchRecipes(1, false);
    fetchAreas();
    const savedFavorites = localStorage.getItem("favorites");
    const savedRatings = localStorage.getItem("ratings");
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
    if (savedRatings) setRatings(JSON.parse(savedRatings));
  }, []);

  const fetchRecipes = async (pageOverride = 1, append = false) => {
    setLoading(true);
    const url = query
      ? `https://www.themealdb.com/api/json/v1/1/search.php?s=${query}`
      : area
      ? `https://www.themealdb.com/api/json/v1/1/filter.php?a=${area}`
      : `https://www.themealdb.com/api/json/v1/1/search.php?s=`;

    const res = await fetch(url);
    const data = await res.json();
    const meals = data.meals || [];
    const sliced = meals.slice(0, pageOverride * 6);
    setRecipes(append ? sliced : meals.slice(0, 6));
    setLoading(false);
  };

  const fetchAreas = async () => {
    const res = await fetch("https://www.themealdb.com/api/json/v1/1/list.php?a=list");
    const data = await res.json();
    setAreas(data.meals.map((m: any) => m.strArea));
  };

  const toggleFavorite = (recipe: any) => {
    const updated = favorites.some((f) => f.idMeal === recipe.idMeal)
      ? favorites.filter((f) => f.idMeal !== recipe.idMeal)
      : [...favorites, recipe];
    setFavorites(updated);
    localStorage.setItem("favorites", JSON.stringify(updated));
  };

  const setRecipeRating = (id: string, stars: number) => {
    const updated = { ...ratings, [id]: stars };
    setRatings(updated);
    localStorage.setItem("ratings", JSON.stringify(updated));
  };

  const getIngredients = (meal: any) => {
    return Array.from({ length: 20 }, (_, i) => {
      const ing = meal[`strIngredient${i + 1}`];
      const measure = meal[`strMeasure${i + 1}`];
      return ing && ing.trim() ? `${measure} ${ing}` : null;
    }).filter(Boolean);
  };

  const assignToMealPlan = (recipe: any) => {
    const selected = new Date(plannerDate);
    const weekKey = format(startOfWeek(selected, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const dayName = dayNames[getDay(selected)];

    const stored = localStorage.getItem("mealPlans");
    const allPlans = stored ? JSON.parse(stored) : {};
    const currentWeek = allPlans[weekKey] || {};
    const daySlots = currentWeek[dayName] || {};
    const updatedSlot = [...(daySlots[selectedSlot] || []), recipe];

    const updatedPlans = {
      ...allPlans,
      [weekKey]: {
        ...currentWeek,
        [dayName]: {
          ...daySlots,
          [selectedSlot]: updatedSlot,
        },
      },
    };

    localStorage.setItem("mealPlans", JSON.stringify(updatedPlans));
    setPlannerTargetRecipe(null);
  };

  const shareMeal = (recipe: any) => {
    if (navigator.share) {
      navigator.share({
        title: recipe.strMeal,
        text: `Check out this recipe: ${recipe.strMeal}`,
        url: window.location.href + `#${recipe.idMeal}`,
      });
    } else {
      alert("Sharing not supported on this browser.");
    }
  };

  return (
    <div className={darkMode ? "dark" : ""}>
      <main className="min-h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 px-4 py-12 font-sans">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
            <h1 className="text-4xl font-bold">🍽️ Recipe Finder</h1>
            <div className="flex gap-2">
              <button onClick={() => setDarkMode(!darkMode)} className="bg-gray-300 dark:bg-gray-700 px-4 py-2 rounded-xl">
                {darkMode ? "☀️ Light" : "🌙 Dark"}
              </button>
              <button onClick={() => setShowFavorites(!showFavorites)} className="bg-pink-500 text-white px-4 py-2 rounded-xl">
                {showFavorites ? "Hide Favorites" : "Show Favorites"}
              </button>
              <a href="/meal-planner" className="bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700">
                📅 Meal Planner
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 max-w-4xl mx-auto mb-6">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchRecipes(1, false)}
              placeholder="Search for a recipe..."
              className="flex-1 px-4 py-3 border rounded-xl bg-white dark:bg-gray-800 text-black dark:text-white"
            />
            <select
              value={area}
              onChange={(e) => {
                setArea(e.target.value);
                setQuery("");
                fetchRecipes(1, false);
              }}
              className="px-4 py-3 border rounded-xl bg-white dark:bg-gray-800 text-black dark:text-white"
            >
              <option value="">Filter by Area</option>
              {areas.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <button
              onClick={() => fetchRecipes(1, false)}
              className="bg-green-500 text-white px-4 py-3 rounded-xl hover:bg-green-600"
            >
              Search
            </button>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {(showFavorites ? favorites : recipes).map((r) => (
              <div key={r.idMeal} onClick={() => setExpandedRecipe(r)} className="cursor-pointer shadow rounded-xl overflow-hidden hover:shadow-lg">
                <img src={r.strMealThumb} className="h-40 w-full object-cover" />
                <div className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-bold">{r.strMeal}</h2>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(r);
                      }}
                    >
                      {favorites.some((f) => f.idMeal === r.idMeal) ? "❤️" : "🤍"}
                    </button>
                  </div>
                  <div className="flex text-yellow-500">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRecipeRating(r.idMeal, star);
                        }}
                      >
                        {ratings[r.idMeal] >= star ? "★" : "☆"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!loading && recipes.length >= page * 6 && (
            <div className="text-center mt-10">
              <button
                onClick={() => {
                  const next = page + 1;
                  setPage(next);
                  fetchRecipes(next, true);
                }}
                className="bg-blue-500 text-white px-6 py-2 rounded-xl hover:bg-blue-600"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      </main>

      {expandedRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setExpandedRecipe(null)} className="absolute top-2 right-4 text-2xl">×</button>
            <img src={expandedRecipe.strMealThumb} className="rounded-xl mb-4 w-full h-48 object-cover" />
            <h2 className="text-2xl font-bold mb-2">{expandedRecipe.strMeal}</h2>
            <h3 className="font-semibold">Ingredients:</h3>
            <ul className="list-disc pl-6 mb-4 max-h-40 overflow-y-auto text-sm">
              {getIngredients(expandedRecipe).map((ing, idx) => (
                <li key={idx}>{ing}</li>
              ))}
            </ul>
            <h3 className="font-semibold">Instructions:</h3>
            <p className="text-sm whitespace-pre-line mb-4">{expandedRecipe.strInstructions}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPlannerTargetRecipe(expandedRecipe)}
                className="bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 flex-1"
              >
                ➕ Add to Meal Planner
              </button>
              <button
                onClick={() => shareMeal(expandedRecipe)}
                className="bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600"
              >
                📤 Share
              </button>
            </div>
          </div>
        </div>
      )}

      {plannerTargetRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-md text-black dark:text-white">
            <h2 className="text-lg font-bold mb-4">Assign to Meal Plan</h2>
            <label className="text-sm block mb-3">
              Date:
              <input
                type="date"
                value={plannerDate}
                onChange={(e) => setPlannerDate(e.target.value)}
                className="w-full mt-1 px-2 py-1 rounded bg-white text-black"
              />
            </label>
            <label className="text-sm block mb-4">
              Meal:
              <select
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                className="w-full mt-1 px-2 py-1 rounded"
              >
                <option value="breakfast">🍳 Breakfast</option>
                <option value="lunch">🥪 Lunch</option>
                <option value="dinner">🍝 Dinner</option>
              </select>
            </label>
            <button
              onClick={() => assignToMealPlan(plannerTargetRecipe)}
              className="w-full bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700"
            >
              ✅ Assign
            </button>
            <button
              onClick={() => setPlannerTargetRecipe(null)}
              className="w-full mt-2 bg-gray-400 text-white py-2 rounded-xl hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}