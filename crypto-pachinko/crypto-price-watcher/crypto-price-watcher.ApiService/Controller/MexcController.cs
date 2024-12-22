using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ApiService.Controller
{
    [Route("api/[controller]")]
    [ApiController]
    public class MexcController : ControllerBase
    {
        private readonly ILogger<MexcController> _logger;

        public MexcController(ILogger<MexcController> logger)
        {
            _logger = logger;
        }

        [HttpGet]
        public IActionResult Get()
        {
            _logger.LogInformation("Called Get method.");
            return Ok("Hello World");
        }
    }
}
