import Department from "../models/Department.js";

/**
 * @route GET /api/v1/departments
 * @desc Fetches the ID and name of all departments, ordered by ID..
 * * @returns {void} Responds with a JSON object containing the list of departments.
 */
export const getAllDepartments = async (req, res) => {
  try {
    // Fetch all departments but ONLY return id and name
    const departments = await Department.findAll({
      attributes: ["id", "name"],
      order: [["id", "ASC"]], // Sort by ID so 'Global' (0) comes first
    });

    res.status(200).json({
      success: true,
      count: departments.length,
      departments: departments,
    });
  } catch (error) {
    console.error("Error fetching departments:", error);
    res.status(500).json({
      success: false,
      message: "Server Error fetching departments",
      error: error.message,
    });
  }
};
