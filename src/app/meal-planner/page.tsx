"use client";

import { useEffect, useRef, useState } from "react";
import html2pdf from "html2pdf.js";
import { format, startOfWeek, addDays } from "date-fns";

type MealPlanWeek = Record<string, Record<string, any[]>>;
type MealPlanAllWeeks = Record<string, MealPlanWeek>;

export default function MealPlanner() {
  const [mealPlans, setMealPlans] = useState<MealPlanAllWeeks>({});
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [viewRecipe, setViewRecipe] = useState<any | null>(null);
  const [startDate, setStartDate] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const exportRef = useRef<HTMLDivElement>(null);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const slots = ["breakfast", "lunch", "dinner"];
  const weekKey = format(startDate, "yyyy-MM-dd");

  const getWeekPlan = () => mealPlans[weekKey] || {};

  useEffect(() => {
    const stored = localStorage.getItem("mealPlans");
    if (stored) setMealPlans(JSON.parse(stored));
    fetch("https://www.themealdb.com/api/json/v1/1/search.php?s=")
      .then((res) => res.json())
      .then((data) => setRecipes(data.meals || []));
  }, []);

  const saveMealPlans = (updated: MealPlanAllWeeks) => {
    setMealPlans(updated);
    localStorage.setItem("mealPlans", JSON.stringify(updated));
  };

  const assign = (day: string, slot: string, recipe: any) => {
    const currentWeek = { ...getWeekPlan() };
    const updatedSlot = [...(currentWeek[day]?.[slot] || []), recipe];
    const updatedDay = {
      ...(currentWeek[day] || {}),
      [slot]: updatedSlot,
    };
    const updatedWeek = {
      ...currentWeek,
      [day]: updatedDay,
    };
    const updatedPlans = {
      ...mealPlans,
      [weekKey]: updatedWeek,
    };
    saveMealPlans(updatedPlans);
    setSelectedDay(null);
    setSelectedSlot(null);
  };

  const removeMeal = (day: string, slot: string, idMeal: string) => {
    const currentWeek = { ...getWeekPlan() };
    const filtered = (currentWeek[day]?.[slot] || []).filter((r) => r.idMeal !== idMeal);
    const updatedWeek = {
      ...currentWeek,
      [day]: {
        ...currentWeek[day],
        [slot]: filtered,
      },
    };
    const updatedPlans = {
      ...mealPlans,
      [weekKey]: updatedWeek,
    };
    saveMealPlans(updatedPlans);
  };

  const getIngredients = (meal: any) => {
    return Array.from({ length: 20 }, (_, i) => {
      const ing = meal[`strIngredient${i + 1}`];
      const measure = meal[`strMeasure${i + 1}`];
      return ing && ing.trim() ? `${measure} ${ing}` : null;
    }).filter(Boolean);
  };

  const exportToPDF = () => {
    if (!exportRef.current) return;
    const opt = {
      margin: 0.5,
      filename: `meal-plan-${weekKey}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    };
    html2pdf().from(exportRef.current).set(opt).save();
  };

  return (
    <main className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">🍱 Meal Planner</h1>
        <div className="flex gap-4 items-center">
          <label className="text-sm">
            📆 Week:
            <input
              type="date"
              value={
                startDate instanceof Date && !isNaN(startDate.getTime())
                  ? format(startDate, "yyyy-MM-dd")
                  : ""
              }
              onChange={(e) => {
                const newDate = new Date(e.target.value);
                if (!isNaN(newDate.getTime())) {
                  setStartDate(startOfWeek(newDate, { weekStartsOn: 1 }));
                }
              }}
              className="ml-2 px-2 py-1 rounded bg-white text-black"
            />
          </label>
          <button
            onClick={exportToPDF}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl"
          >
            📄 Export to PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-12">
        {days.map((day, i) => (
          <div key={day} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
            <h2 className="font-bold text-lg mb-4 text-center">
              {day}
              <br />
              <span className="text-xs text-gray-400">
                {format(addDays(startDate, i), "MMM d")}
              </span>
            </h2>
            {slots.map((slot) => (
              <div key={slot} className="mb-4">
                <h3 className="text-sm font-semibold capitalize mb-1">
                  {slot === "breakfast" ? "🍳 Breakfast" : slot === "lunch" ? "🥪 Lunch" : "🍝 Dinner"}
                </h3>
                {(getWeekPlan()[day]?.[slot] || []).map((meal: any, idx: number) => (
                  <div key={idx} className="relative group mb-2">
                    <img
                      src={meal.strMealThumb}
                      onClick={() => setViewRecipe(meal)}
                      className="rounded-lg mb-1 w-full h-24 object-cover cursor-pointer group-hover:brightness-90 transition"
                    />
                    <p className="text-xs">{meal.strMeal}</p>
                    <button
                      onClick={() => removeMeal(day, slot, meal.idMeal)}
                      className="absolute top-1 right-1 text-white bg-red-600 w-6 h-6 rounded-full text-center text-sm font-bold"
                    >
                      –
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    setSelectedDay(day);
                    setSelectedSlot(slot);
                  }}
                  className="mt-2 text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                >
                  Assign
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Export PDF layout */}
      <div ref={exportRef} className="bg-white text-black p-8">
        <h1 className="text-2xl font-bold text-center mb-2">🗓️ Weekly Meal Plan</h1>
        <p className="text-center mb-8 text-sm">
          Week of {format(startDate, "MMM d")} – {format(addDays(startDate, 6), "MMM d, yyyy")}
        </p>
        {days.map((day, i) => (
          <div key={day} className="mb-6 border-b pb-4">
            <h2 className="text-lg font-bold mb-2">
              {day} – {format(addDays(startDate, i), "MMM d")}
            </h2>
            {slots.map((slot) => (
              <div key={slot} className="mb-4">
                <h3 className="text-md font-semibold capitalize mb-1">
                  {slot === "breakfast" ? "🍳 Breakfast" : slot === "lunch" ? "🥪 Lunch" : "🍝 Dinner"}
                </h3>
                {(getWeekPlan()[day]?.[slot] || []).map((meal: any, idx: number) => (
                  <div key={idx} className="pl-4 mb-4">
                    <p className="font-bold">{meal.strMeal}</p>
                    <img src={meal.strMealThumb} alt="" className="w-32 rounded mb-2" />
                    <p className="text-sm italic mb-1">Ingredients:</p>
                    <ul className="list-disc pl-5 text-sm mb-1">
                      {getIngredients(meal).map((ing: string, j: number) => (
                        <li key={j}>{ing}</li>
                      ))}
                    </ul>
                    <p className="text-sm italic mb-1">Instructions:</p>
                    <p className="text-sm whitespace-pre-line">{meal.strInstructions}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      {selectedDay && selectedSlot && (
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4">
            Choose a meal for {selectedSlot} on {selectedDay}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {recipes.map((r) => (
              <div
                key={r.idMeal}
                onClick={() => assign(selectedDay, selectedSlot, r)}
                className="cursor-pointer p-3 border rounded-xl hover:shadow-lg bg-white dark:bg-gray-800"
              >
                <img src={r.strMealThumb} className="rounded-xl mb-2" />
                <h3 className="text-sm font-semibold">{r.strMeal}</h3>
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              setSelectedDay(null);
              setSelectedSlot(null);
            }}
            className="mt-6 px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
          >
            Cancel
          </button>
        </div>
      )}

      {viewRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg text-black dark:text-white relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setViewRecipe(null)} className="absolute top-2 right-3 text-2xl">×</button>
            <img src={viewRecipe.strMealThumb} className="w-full h-48 object-cover rounded-xl mb-4" />
            <h2 className="text-2xl font-bold mb-2">{viewRecipe.strMeal}</h2>
            <h3 className="font-semibold mb-1">Ingredients:</h3>
            <ul className="list-disc pl-5 text-sm mb-4">
              {getIngredients(viewRecipe).map((ing, i) => (
                <li key={i}>{ing}</li>
              ))}
            </ul>
            <h3 className="font-semibold mb-1">Instructions:</h3>
            <p className="text-sm whitespace-pre-line">{viewRecipe.strInstructions}</p>
          </div>
        </div>
      )}
    </main>
  );
}



